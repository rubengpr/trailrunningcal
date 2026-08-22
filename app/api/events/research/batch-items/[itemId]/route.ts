import { NextResponse } from 'next/server';

import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { requireAdmin } from '@/lib/auth';
import { getEventResearchItem } from '@/lib/db/event-research-batches';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { itemId } = await params;
    const id = parseUuidParam(itemId, 'Invalid item ID');
    const data = await getEventResearchItem(id);
    if (!data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
