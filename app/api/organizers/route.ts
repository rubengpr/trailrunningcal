import { requireAuth } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { updateOrganizer } from '@/lib/db/organizers';
import { parseOrganizerInput } from './validation';

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const body = await request.json();
    const input = parseOrganizerInput(body);
    const data = await updateOrganizer(user.id, input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
