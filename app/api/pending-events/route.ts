import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createPendingEvents } from '@/lib/services/pending-events';
import { handleRouteError } from '@/lib/utils/handle-error';
import {
  validateUrlsPayload,
  validateAndNormalizeUrls,
} from '@/app/api/url-list-validation';
import { assertRequestBody, parseJsonBody } from '@/app/api/request-validation';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await parseJsonBody(request);
    assertRequestBody(body);
    const { urls } = body;

    validateUrlsPayload(urls);
    const { validUrls, invalidSkips } = validateAndNormalizeUrls(urls);

    const result = await createPendingEvents(validUrls);

    return NextResponse.json(
      {
        success: true,
        data: {
          added: result.added,
          skipped: [...invalidSkips, ...result.skipped],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
