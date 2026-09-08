import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseInput } from './validation';
import { parseJsonBody } from '@/app/api/request-validation';
import { extractEvent } from '@/lib/services/event-extraction';

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await parseJsonBody(request);
    const input = parseInput(body);

    const data = await extractEvent(input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
