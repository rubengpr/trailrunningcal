import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getItemResult } from '@/lib/db/event-import-batches';
import {
  acceptItem,
  updateItemResult,
} from '@/lib/services/event-import-batch';
import { parseEventInput } from '@/app/api/events/validation';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    await requireAdmin();

    const { itemId } = await params;
    const parsedItemId = parseUuidParam(itemId, 'Invalid item ID');

    const data = await getItemResult(parsedItemId);

    if (!data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { itemId } = await params;
    const parsedItemId = parseUuidParam(itemId, 'Invalid item ID');
    const input = parseEventInput(await request.json());
    const data = await updateItemResult(parsedItemId, input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { itemId } = await params;
    const parsedItemId = parseUuidParam(itemId, 'Invalid item ID');
    const data = await acceptItem(parsedItemId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
