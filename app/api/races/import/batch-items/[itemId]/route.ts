import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getItemResult } from '@/lib/db/race-import-batches';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { itemId } = await context.params;
    const data = await getItemResult(itemId);

    if (!data) {
      return NextResponse.json(
        { error: 'Race import item result not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
