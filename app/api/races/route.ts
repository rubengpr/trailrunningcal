import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { parseRaceInput, ValidationError } from '@/app/api/races/validation';
import { DuplicateRaceError } from '@/lib/errors';
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
    if (error instanceof DuplicateRaceError) {
      return NextResponse.json(
        { error: 'conflict', conflicts: error.conflicts },
        { status: 409 },
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
