import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import {
  revalidateEventRelatedPages,
  revalidateHomepages,
} from '@/lib/cache/revalidation';
import { deleteEventForAdmin, getEventByIdForAdmin } from '@/lib/db/events';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseEventPatchInput } from '@/app/api/events/validation';
import { createEventEdition, updateEventWithRaces } from '@/lib/services/events';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAdmin();

    const { eventId } = await context.params;
    const parsedEventId = parseUuidParam(eventId, 'event id');
    const input = parseEventPatchInput(await request.json());
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
    const eventDetail = await getEventByIdForAdmin(parsedEventId);

    if (!eventDetail) {
      throw new ValidationError('Event not found', 404);
    }

    await deleteEventForAdmin(parsedEventId);

    revalidateHomepages();
    revalidateEventRelatedPages(eventDetail);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleRouteError(error);
  }
}
