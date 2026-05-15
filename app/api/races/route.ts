import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { parseRaceInput } from '@/app/api/races/validation';
import { handleRouteError } from '@/lib/api/handle-error';
import { createRace } from '@/lib/services/races';

export async function POST(request: NextRequest) {
  try {
    const { user, isAdmin } = await requireAuth();
    const body = await request.json();
    const input = parseRaceInput(body, isAdmin);

    const raceId = await createRace(input, user.id, isAdmin);

    return NextResponse.json(
      { success: true, data: { id: raceId } },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
