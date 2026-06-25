import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { startEventUpdateBatch } from '@/lib/services/event-update-batch';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireCronSecret(request);
    const data = await startEventUpdateBatch();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
