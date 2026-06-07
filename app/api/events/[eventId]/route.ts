import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import {
  revalidateCategoryPages,
  revalidateEventPages,
  revalidateHomepages,
  revalidateProvincePage,
  revalidateRacePages,
} from '@/lib/cache/revalidation';
import { deleteEventForAdmin, getEventByIdForAdmin } from '@/lib/db/events';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import { handleRouteError } from '@/lib/utils/handle-error';
import { parseEventUpdateInput } from '@/app/api/events/validation';
import { updateEventWithRaces } from '@/lib/services/events';
import type { TrailEventDetail } from '@/types/event.types';

function revalidateEventDetail(detail: TrailEventDetail): void {
  revalidateEventPages(detail.event.slug);

  for (const race of detail.races) {
    revalidateRacePages(race.name);
    revalidateCategoryPages(race);
    if (race.province) revalidateProvincePage(race.province);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAdmin();

    const { eventId } = await context.params;
    const parsedEventId = parseUuidParam(eventId, 'event id');
    const input = parseEventUpdateInput(await request.json());
    const previousDetail = await getEventByIdForAdmin(parsedEventId);

    if (!previousDetail) {
      throw new ValidationError('Event not found', 404);
    }

    await updateEventWithRaces(parsedEventId, input);
    const updatedDetail = await getEventByIdForAdmin(parsedEventId);

    if (!updatedDetail) {
      throw new ValidationError('Event not found', 404);
    }

    revalidateHomepages();
    revalidateEventDetail(previousDetail);
    revalidateEventDetail(updatedDetail);

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
    revalidateEventDetail(eventDetail);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleRouteError(error);
  }
}
