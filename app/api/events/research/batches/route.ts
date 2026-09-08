import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth';
import {
  listEventResearchBatchHistory,
  startEventResearchBatch,
} from '@/lib/services/event-research-batch';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseResearchBatchInput } from './validation';
import { parseJsonBody } from '@/app/api/request-validation';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();
    const body = await parseJsonBody(request);
    const input = parseResearchBatchInput(body);
    const data = await startEventResearchBatch(input.eventNames);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
    const data = await listEventResearchBatchHistory();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
