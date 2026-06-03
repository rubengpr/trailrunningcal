import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getEventDescriptionBatchStatus } from '@/lib/db/event-description-batches';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ batchId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { batchId: rawBatchId } = await context.params;
    const batchId = parseUuidParam(rawBatchId, 'batch id');
    const data = await getEventDescriptionBatchStatus(batchId);

    if (!data) {
      return NextResponse.json(
        { error: 'Event description batch not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
