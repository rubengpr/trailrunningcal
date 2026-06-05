import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseInput } from './validation';
import { extractFromMarkdown, extractFromImages } from '@/lib/integrations/openrouter/service';
import { EMPTY_PAGE_STATS } from '@/lib/services/event-import';

export const maxDuration = 60;

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
        event: result.event,
        races: result.races,
        errorMessage: result.errorMessage,
        rawModelOutput: result.rawModelOutput,
        usage: result.usage,
        pageStats: EMPTY_PAGE_STATS,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
