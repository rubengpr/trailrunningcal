import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  processCrawlSite,
  processCrawlSiteExtract,
  processScrapePage,
  processScrapePageExtract,
} from '@/lib/services/race-import';
import { parseInput, ValidationError } from './validation';
import { DuplicateRaceError } from '@/lib/errors';

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const input = parseInput(body);

    if (input.workflow === 'crawlSiteExtract') {
      const data = await processCrawlSiteExtract(input);
      return NextResponse.json({ success: true, data });
    }

    if (input.workflow === 'scrapePageExtract') {
      const data = await processScrapePageExtract(input);
      return NextResponse.json({ success: true, data });
    }

    if (input.workflow === 'crawlSite') {
      const data = await processCrawlSite(input);
      return NextResponse.json({ success: true, data });
    }

    if (input.workflow === 'scrapePage') {
      const data = await processScrapePage(input);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Invalid workflow' }, { status: 400 });
  } catch (error) {
    if (error instanceof DuplicateRaceError) {
      return NextResponse.json(
        { error: 'conflict', conflicts: error.conflicts },
        { status: 409 },
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('Race import API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
