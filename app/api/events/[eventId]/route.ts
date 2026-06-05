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
    revalidateEventPages(eventDetail.event.slug);

    for (const race of eventDetail.races) {
      revalidateRacePages(race.name);
      revalidateCategoryPages(race);
      if (race.province) revalidateProvincePage(race.province);
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleRouteError(error);
  }
}
