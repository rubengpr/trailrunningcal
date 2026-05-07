import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { getRaceImportBatchItemResult } from '@/lib/db/race-import-batches';
import { ValidationError } from '@/lib/errors';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { itemId } = await context.params;
    const data = await getRaceImportBatchItemResult(itemId);

    if (!data) {
      return NextResponse.json(
        { error: 'Race import batch item result not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('Race import batch item result API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
