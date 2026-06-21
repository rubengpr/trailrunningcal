import { NextRequest, NextResponse } from 'next/server';
import { getEventsByIds } from '@/lib/db/events';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseFavoriteEventIds } from './validation';
import { toPublicEventDetail } from '@/lib/events/utils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const eventIds = parseFavoriteEventIds(body);
    const events = await getEventsByIds(eventIds);
    const data = events.map(toPublicEventDetail);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
