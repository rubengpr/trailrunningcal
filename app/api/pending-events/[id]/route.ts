import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { removePendingEvent } from '@/lib/services/pending-events';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const pendingEventId = parseUuidParam(id, 'pending event id');

    await removePendingEvent(pendingEventId);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleRouteError(error);
  }
}
