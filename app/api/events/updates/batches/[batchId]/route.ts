import { NextResponse } from 'next/server';

import { parseUuidParam } from '@/app/api/request-validation';
import { requireAdmin } from '@/lib/auth';
import { getEventUpdateBatchStatus } from '@/lib/services/event-update-batch';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { batchId } = await params;
    const id = parseUuidParam(batchId, 'Invalid batch ID');
    const data = await getEventUpdateBatchStatus(id);
    if (!data) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
