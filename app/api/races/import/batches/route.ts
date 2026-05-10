import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { startRaceImportBatch } from '@/lib/services/race-import-batch';
import { parseBatchInput, ValidationError } from './validation';
import { conflictCheckResponse } from '@/app/api/races/race-url-conflict';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const input = parseBatchInput(body);

    const conflict = await conflictCheckResponse(input.urls);
    if (conflict) return conflict;

    const data = await startRaceImportBatch(input);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('Race import batch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
