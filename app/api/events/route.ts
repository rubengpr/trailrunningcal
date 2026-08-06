import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseEventInput } from '@/app/api/events/validation';
import { createEventWithRaces } from '@/lib/services/events';
import { handleRouteError } from '@/lib/utils/handle-error';
import { getUpcomingEventsPage } from '@/lib/db/events';
import { parsePublicEventPageRequest } from './public-validation';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const input = parsePublicEventPageRequest(request.nextUrl.searchParams);
    const data = await getUpcomingEventsPage(input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json();
    const input = parseEventInput(body);
    const data = await createEventWithRaces(input);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
