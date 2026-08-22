import { NextResponse } from 'next/server';

import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { requireAdmin } from '@/lib/auth';
import { getEventResearchBatchStatus } from '@/lib/services/event-research-batch';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { batchId } = await params;
    const id = parseUuidParam(batchId, 'Invalid batch ID');
    const data = await getEventResearchBatchStatus(id);
    if (!data) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
