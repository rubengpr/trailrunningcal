import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { startEventDescriptionBatch } from '@/lib/services/event-description-batch';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseBatchInput } from './validation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const input = parseBatchInput(body);
    const data = await startEventDescriptionBatch(input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
