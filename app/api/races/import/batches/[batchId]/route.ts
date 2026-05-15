import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getBatchStatus } from '@/lib/db/race-import-batches';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ batchId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { batchId } = await context.params;
    const data = await getBatchStatus(batchId);

    if (!data) {
      return NextResponse.json(
        { error: 'Race import batch not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
