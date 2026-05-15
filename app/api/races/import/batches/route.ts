import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { startRaceImportBatch } from '@/lib/services/race-import-batch';
import { parseBatchInput } from './validation';
import { handleRouteError } from '@/lib/api/handle-error';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const input = parseBatchInput(body);

    const data = await startRaceImportBatch(input);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
