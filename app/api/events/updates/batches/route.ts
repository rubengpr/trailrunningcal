import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth';
import { listEventUpdateBatchHistory } from '@/lib/services/event-update-batch';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
    const data = await listEventUpdateBatchHistory();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
