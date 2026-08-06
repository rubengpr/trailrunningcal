import { NextRequest, NextResponse } from 'next/server';
import { parseEventMapLocations } from '@/app/api/event-locations/validation';
import { getPublicEventLocations } from '@/lib/db/event-locations';
import { handleRouteError } from '@/lib/utils/handle-error';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const input = parseEventMapLocations(body);
    const locations = await getPublicEventLocations(input);

    return NextResponse.json({
      success: true,
      data: { locations },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
