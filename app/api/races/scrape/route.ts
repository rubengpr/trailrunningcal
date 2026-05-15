import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/api/handle-error';
import { parseInput } from './validation';
import { crawlSite, scrapePage } from '@/lib/integrations/spider-cloud/service';

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const input = parseInput(body);

    if (input.mode === 'scrapePage') {
      const { markdown, pageStats } = await scrapePage(input.url);
      return NextResponse.json({
        success: true,
        data: { markdown, pageStats },
      });
    }

    if (input.mode === 'crawlSite') {
      const { markdown, pageStats } = await crawlSite(input.url);
      return NextResponse.json({
        success: true,
        data: { markdown, pageStats },
      });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}
