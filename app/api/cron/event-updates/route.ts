import { NextRequest, NextResponse } from 'next/server';
import { parseUuidParam } from '@/app/api/request-validation';
import { requireCronSecret } from '@/lib/auth/cron';
import {
  resumeEventUpdateBatch,
  startEventUpdateBatch,
} from '@/lib/services/event-update-batch';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireCronSecret(request);
    const batchId = new URL(request.url).searchParams.get('batchId');
    const data = batchId
      ? await resumeEventUpdateBatch(parseUuidParam(batchId, 'Invalid batch ID'))
      : await startEventUpdateBatch();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
