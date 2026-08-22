import { NextResponse } from 'next/server';

import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { requireAdmin } from '@/lib/auth';
import { retryEventResearchItem } from '@/lib/services/event-research-batch';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { itemId } = await params;
    const id = parseUuidParam(itemId, 'Invalid item ID');
    const data = await retryEventResearchItem(id);
    return NextResponse.json({ success: true, data }, { status: 202 });
  } catch (error) {
    return handleRouteError(error);
  }
}
