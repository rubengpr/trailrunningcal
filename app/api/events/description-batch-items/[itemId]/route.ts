import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getEventDescriptionItemResult } from '@/lib/db/event-description-batches';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { itemId: rawItemId } = await context.params;
    const itemId = parseUuidParam(rawItemId, 'item id');
    const data = await getEventDescriptionItemResult(itemId);

    if (!data) {
      return NextResponse.json(
        { error: 'Event description item result not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
