import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { updateOrganizer } from '@/lib/db/organizers';
import { handleRouteError } from '@/lib/api/handle-error';
import { parseOrganizerInput } from './validation';

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const body = await request.json();
    const input = parseOrganizerInput(body);
    const data = await updateOrganizer(user.id, input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
