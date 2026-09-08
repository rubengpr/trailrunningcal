import { NextResponse } from 'next/server';

import { parseUuidParam } from '@/app/api/request-validation';
import { requireAdmin } from '@/lib/auth';
import { resumeEventUpdateBatch } from '@/lib/services/event-update-batch';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
    const { batchId } = await params;
    const data = await resumeEventUpdateBatch(
      parseUuidParam(batchId, 'Invalid batch ID'),
    );
    return NextResponse.json({ success: true, data }, { status: 202 });
  } catch (error) {
    return handleRouteError(error);
  }
}
