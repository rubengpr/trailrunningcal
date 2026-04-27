import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin, parseInput, ValidationError } from './validate-input';
import { crawlSite, scrapePage } from '@/lib/agents/spider-service';
import { extractFromMarkdown, extractFromImages } from './extract';
import type { CrawlPageStats } from '@/types/races-scrape-api.types';

export const maxDuration = 60;

const EMPTY_CRAWL_PAGE_STATS: CrawlPageStats = {
  total: 0,
  successCount: 0,
  errorCount: 0,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdmin();

    const body = await request.json();
    const input = parseInput(body);

    if (input.mode === 'scrapeOnly') {
      const { markdown, crawlPageStats } = await scrapePage(input.url);
      return NextResponse.json({
        success: true,
        data: { markdown, crawlPageStats },
      });
    }

    if (input.mode === 'crawlOnly') {
      const { markdown, crawlPageStats } = await crawlSite(input.url);
      return NextResponse.json({
        success: true,
        data: { markdown, crawlPageStats },
      });
    }

    if (input.mode === 'llmFromImages') {
      const result = await extractFromImages(input.images, input.model);
      return NextResponse.json({
        success: true,
        data: {
          races: result.races,
          markdown: '',
          rawModelOutput: result.rawModelOutput,
          usage: result.usage,
          crawlPageStats: EMPTY_CRAWL_PAGE_STATS,
        },
      });
    }

    const { markdown, crawlPageStats } =
      input.mode === 'llmFromMarkdown'
        ? { markdown: input.markdown, crawlPageStats: EMPTY_CRAWL_PAGE_STATS }
        : await crawlSite(input.url);

    const result = await extractFromMarkdown(markdown, input.model);
    return NextResponse.json({
      success: true,
      data: {
        races: result.races,
        markdown,
        rawModelOutput: result.rawModelOutput,
        usage: result.usage,
        crawlPageStats,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof Error && error.message === 'INVALID_URL') {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 },
      );
    }
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
