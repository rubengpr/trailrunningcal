import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateEventDescriptionForAdmin } from '@/lib/db/events';
import { sanitizeEventDescription } from '@/lib/services/event-description';
import { handleRouteError } from '@/lib/utils/handle-error';
import { ValidationError } from '@/lib/errors';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { eventId } = await context.params;
    const body = await request.json().catch(() => null);

    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body', 400);
    }

    const result = sanitizeEventDescription(body.description);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const data = await updateEventDescriptionForAdmin(eventId, result.value);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
