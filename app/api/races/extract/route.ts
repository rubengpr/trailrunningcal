import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseInput, ValidationError } from './validation';
import { extractFromMarkdown, extractFromImages } from '@/lib/integrations/openrouter/service';
import type { PageStats } from '@/types/races-scrape-api.types';

export const maxDuration = 60;

const EMPTY_PAGE_STATS: PageStats = {
  total: 0,
  successCount: 0,
  errorCount: 0,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const input = parseInput(body);

    const result =
      input.mode === 'images'
        ? await extractFromImages(input.images, input.model)
        : await extractFromMarkdown(input.markdown, input.model);

    return NextResponse.json({
      success: true,
      data: {
        races: result.races,
        errorMessage: result.errorMessage,
        rawModelOutput: result.rawModelOutput,
        usage: result.usage,
        pageStats: EMPTY_PAGE_STATS,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Extract API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
