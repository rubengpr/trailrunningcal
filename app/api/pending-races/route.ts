import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { createPendingRaces } from '@/lib/services/pending-races';
import { validateUrlsPayload, validateAndNormalizeUrls } from './validation';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { urls } = body;

    const payloadError = validateUrlsPayload(urls);
    if (payloadError) {
      return NextResponse.json({ error: payloadError }, { status: 400 });
    }

    const { validUrls, invalidSkips } = validateAndNormalizeUrls(urls);

    const result = await createPendingRaces(validUrls);

    return NextResponse.json({
      success: true,
      data: {
        added: result.added,
        skipped: [...invalidSkips, ...result.skipped],
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
