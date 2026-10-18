import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseUuidParam } from '@/app/api/request-validation';
import { getItemArtifacts } from '@/lib/db/event-import-batches';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    await requireAdmin();
    const { itemId } = await params;
    const data = await getItemArtifacts(parseUuidParam(itemId, 'item id'));

    if (!data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
