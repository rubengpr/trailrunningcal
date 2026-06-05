import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getItemResult } from '@/lib/db/event-import-batches';
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
