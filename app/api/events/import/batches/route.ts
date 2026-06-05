import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { startEventImportBatch } from '@/lib/services/event-import-batch';
import { parseBatchInput } from './validation';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const input = parseBatchInput(body);

    const data = await startEventImportBatch(input);

    return NextResponse.json({
      success: true,
      data,
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
