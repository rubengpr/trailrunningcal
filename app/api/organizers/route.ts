import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { updateUserOrganizer } from '@/lib/services/organizers';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseOrganizerInput } from './validation';
import { assertRequestBody, parseJsonBody } from '@/app/api/request-validation';

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const body = await parseJsonBody(request);
    assertRequestBody(body);
    const input = parseOrganizerInput(body);
    const data = await updateUserOrganizer(user.id, input);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
