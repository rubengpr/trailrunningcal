import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import {
  listEventResearchBatchHistory,
  startEventResearchBatch,
} from '@/lib/services/event-research-batch';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseResearchBatchInput } from './validation';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid request body', 400);
    }
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
