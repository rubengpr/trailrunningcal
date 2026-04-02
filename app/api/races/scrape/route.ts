import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';
import { runTrailRaceMarkdownAgentOpenRouter } from '@/lib/agents/trail-race-openrouter';
import { createOpenRouterClient } from '@/lib/openrouter/openrouter-client';
import { isOpenRouterScrapeModelId } from '@/lib/openrouter/scrape-models';
import {
  spiderCloudCrawl,
  summarizeSpiderCrawlHttpStatus,
} from '@/lib/agents/spider-crawl';
import { joinSpiderCrawlPagesToMarkdown } from '@/lib/agents/spider-crawl-join-markdown';
import { normalizeUrl } from '@/lib/validation';
import { MAX_SCRAPE_MARKDOWN_BYTES } from '@/lib/scrape-markdown-limits';
import {
  isScrapePipelineMode,
  type CrawlPageStats,
  type ScrapePipelineMode,
} from '@/types/races-scrape-api.types';

export const maxDuration = 60;

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function resolveMode(
  bodyMode: unknown,
  hasUrl: boolean,
  hasMarkdown: boolean,
): ScrapePipelineMode | null {
  if (bodyMode !== undefined && bodyMode !== null && bodyMode !== '') {
    if (!isScrapePipelineMode(bodyMode)) {
      return null;
    }
    return bodyMode;
  }
  if (hasMarkdown) {
    return 'llmFromMarkdown';
  }
  if (hasUrl) {
    return 'crawlAndLlm';
  }
  return null;
}

const EMPTY_CRAWL_PAGE_STATS: CrawlPageStats = {
  total: 0,
  successCount: 0,
  errorCount: 0,
};

async function crawlUrlToMarkdown(
  urlStr: string,
): Promise<{ markdown: string; crawlPageStats: CrawlPageStats }> {
  const normalizedUrl = normalizeUrl(urlStr);
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('INVALID_URL');
  }
  const pages = await spiderCloudCrawl(normalizedUrl);
  const crawlPageStats = summarizeSpiderCrawlHttpStatus(pages);
  const markdown = joinSpiderCrawlPagesToMarkdown(normalizedUrl, pages);
  return { markdown, crawlPageStats };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteUrl, markdown, model, mode: bodyMode } = body;

    const urlStr =
      typeof websiteUrl === 'string' ? websiteUrl.trim() : '';
    const markdownStr =
      typeof markdown === 'string' ? markdown.trim() : '';

    const hasUrl = urlStr.length > 0;
    const hasMarkdown = markdownStr.length > 0;

    if (hasUrl && hasMarkdown) {
      return NextResponse.json(
        { error: 'Provide either a website URL or markdown, not both' },
        { status: 400 },
      );
    }

    const mode = resolveMode(bodyMode, hasUrl, hasMarkdown);

    if (mode === null) {
      if (
        bodyMode !== undefined &&
        bodyMode !== null &&
        bodyMode !== '' &&
        !isScrapePipelineMode(bodyMode)
      ) {
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
      }
      return NextResponse.json(
        { error: 'Website URL or markdown is required' },
        { status: 400 },
      );
    }

    if (mode === 'crawlOnly') {
      if (hasMarkdown) {
        return NextResponse.json(
          { error: 'Crawl-only mode does not accept markdown' },
          { status: 400 },
        );
      }
      if (!hasUrl) {
        return NextResponse.json(
          { error: 'Website URL is required for crawl-only mode' },
          { status: 400 },
        );
      }
      try {
        const { markdown, crawlPageStats } = await crawlUrlToMarkdown(urlStr);
        return NextResponse.json({
          success: true,
          data: { markdown, crawlPageStats },
        });
      } catch (crawlError) {
        if (crawlError instanceof Error && crawlError.message === 'INVALID_URL') {
          return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }
        throw crawlError;
      }
    }

    if (mode === 'llmFromMarkdown') {
      if (hasUrl) {
        return NextResponse.json(
          { error: 'Markdown mode does not accept a website URL' },
          { status: 400 },
        );
      }
      if (!hasMarkdown) {
        return NextResponse.json(
          { error: 'Markdown is required for this mode' },
          { status: 400 },
        );
      }
    }

    if (mode === 'crawlAndLlm') {
      if (hasMarkdown) {
        return NextResponse.json(
          { error: 'Full pipeline mode does not accept markdown; use a URL' },
          { status: 400 },
        );
      }
      if (!hasUrl) {
        return NextResponse.json(
          { error: 'Website URL is required for this mode' },
          { status: 400 },
        );
      }
    }

    if (model === undefined || model === null || model === '') {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    if (!isOpenRouterScrapeModelId(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }

    if (hasMarkdown && utf8ByteLength(markdownStr) > MAX_SCRAPE_MARKDOWN_BYTES) {
      return NextResponse.json({ error: 'Markdown content is too large' }, { status: 400 });
    }

    let markdownContent: string;
    let crawlPageStats: CrawlPageStats = EMPTY_CRAWL_PAGE_STATS;

    if (mode === 'llmFromMarkdown') {
      markdownContent = markdownStr;
    } else {
      try {
        const crawled = await crawlUrlToMarkdown(urlStr);
        markdownContent = crawled.markdown;
        crawlPageStats = crawled.crawlPageStats;
      } catch (crawlError) {
        if (crawlError instanceof Error && crawlError.message === 'INVALID_URL') {
          return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }
        throw crawlError;
      }
    }

    const client = createOpenRouterClient();
    const result = await runTrailRaceMarkdownAgentOpenRouter(
      client,
      markdownContent,
      model,
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const futureRaces = result.races.filter((race) => race.date >= todayStr);
    return NextResponse.json({
      success: true,
      data: {
        races: futureRaces,
        markdown: markdownContent,
        rawModelOutput: result.rawModelOutput,
        usage: result.usage,
        crawlPageStats,
      },
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
