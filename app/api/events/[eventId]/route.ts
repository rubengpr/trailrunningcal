import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import {
  revalidateEventRelatedPages,
  revalidateHomepages,
} from '@/lib/cache/revalidation';
import { getEventByIdForAdmin } from '@/lib/db/events';
import { parseJsonBody, parseUuidParam } from '@/app/api/request-validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseEventPatchInput } from '@/app/api/events/validation';
import {
  createEventEdition,
  removeAdminEvent,
  updateEventWithRaces,
} from '@/lib/services/events';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAdmin();

    const { eventId } = await context.params;
    const parsedEventId = parseUuidParam(eventId, 'event id');
    const input = parseEventPatchInput(await parseJsonBody(request));
    const previousDetail = await getEventByIdForAdmin(parsedEventId);

    if (!previousDetail) {
      throw new ValidationError('Event not found', 404);
    }

    let updatedDetail = previousDetail;

    if (input.mode === 'update-races') {
      updatedDetail = await updateEventWithRaces(parsedEventId, input);
    }

    if (input.mode === 'insert-races') {
      updatedDetail = await createEventEdition(parsedEventId, input);
    }

    revalidateHomepages();
    revalidateEventRelatedPages(previousDetail);
    revalidateEventRelatedPages(updatedDetail);

    return NextResponse.json({ success: true, data: updatedDetail });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAdmin();

    const { eventId } = await context.params;
    const parsedEventId = parseUuidParam(eventId, 'event id');
    await removeAdminEvent(parsedEventId);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleRouteError(error);
  }
}
