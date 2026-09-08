import { NextResponse } from 'next/server';

import { parseUuidParam } from '@/app/api/request-validation';
import { requireAdmin } from '@/lib/auth';
import { retryEventUpdateBatchItem } from '@/lib/services/event-update-batch';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string; itemId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { batchId, itemId } = await params;
    const data = await retryEventUpdateBatchItem({
      batchId: parseUuidParam(batchId, 'Invalid batch ID'),
      itemId: parseUuidParam(itemId, 'Invalid item ID'),
    });
    return NextResponse.json({ success: true, data }, { status: 202 });
  } catch (error) {
    return handleRouteError(error);
  }
}
