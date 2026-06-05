import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getBatchStatus } from '@/lib/services/event-import-batch';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    await requireAdmin();

    const { batchId } = await params;
    const parsedBatchId = parseUuidParam(batchId, 'Invalid batch ID');

    const data = await getBatchStatus(parsedBatchId);

    if (!data) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
