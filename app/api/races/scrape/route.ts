import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';
import { runTrailRaceMarkdownAgentOpenRouter } from '@/lib/agents/trail-race-openrouter';
import { createOpenRouterClient } from '@/lib/openrouter/openrouter-client';
import { isOpenRouterScrapeModelId } from '@/lib/openrouter/scrape-models';
import { spiderCloudCrawl } from '@/lib/agents/spider-crawl';
import { joinSpiderCrawlPagesToMarkdown } from '@/lib/agents/spider-crawl-join-markdown';
import { normalizeUrl } from '@/lib/validation';
import { MAX_SCRAPE_MARKDOWN_BYTES } from '@/lib/scrape-markdown-limits';

export const maxDuration = 60;

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
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
    const { websiteUrl, markdown, model } = body;

    if (model === undefined || model === null || model === '') {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    if (!isOpenRouterScrapeModelId(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }

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

    if (!hasUrl && !hasMarkdown) {
      return NextResponse.json(
        { error: 'Website URL or markdown is required' },
        { status: 400 },
      );
    }

    if (hasMarkdown && utf8ByteLength(markdownStr) > MAX_SCRAPE_MARKDOWN_BYTES) {
      return NextResponse.json({ error: 'Markdown content is too large' }, { status: 400 });
    }

    let markdownContent: string;

    if (hasMarkdown) {
      markdownContent = markdownStr;
    } else {
      const normalizedUrl = normalizeUrl(urlStr);

      try {
        new URL(normalizedUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }

      const pages = await spiderCloudCrawl(normalizedUrl);
      markdownContent = joinSpiderCrawlPagesToMarkdown(normalizedUrl, pages);
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
      },
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
