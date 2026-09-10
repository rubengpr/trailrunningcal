import { ValidationError } from '@/lib/errors';
import { getEventByIdForAdmin, getEventByIdForOrganizer } from '@/lib/db/events';
import { deleteEventForAdmin } from '@/lib/db/events';
import {
  revalidateEventRelatedPages,
  revalidateHomepages,
} from '@/lib/cache/revalidation';
import type { TrailEventDetail } from '@/types/event.types';
import { isValidProvince } from '@/lib/geography/provinces';
import {
  insertEvent,
  insertEventEdition,
  updateEvent,
  updateOrganizerEvent,
} from '@/lib/db/event-writes';
import type {
  EventRaceWriteInput,
  EventWriteInput,
} from '@/types/event-write.types';

function validateRaces(races: EventRaceWriteInput[]): void {
  if (races.some((race) => !isValidProvince(race.province))) {
    throw new ValidationError('Invalid province', 400);
  }
}

export async function createEventWithRaces(
  input: EventWriteInput,
): Promise<{ id: string }> {
  validateRaces(input.races);
  return { id: await insertEvent(input) };
}

export async function updateEventWithRaces(
  eventId: string,
  input: EventWriteInput,
): Promise<TrailEventDetail> {
  validateRaces(input.races);
  const detail = await getEventByIdForAdmin(await updateEvent(eventId, input));

  if (!detail) {
    throw new ValidationError('Event not found', 404);
  }

  return detail;
}

export async function updateOrganizerEventWithRaces(
  eventId: string,
  organizerId: string,
  input: EventWriteInput,
): Promise<TrailEventDetail> {
  validateRaces(input.races);
  const detail = await getEventByIdForOrganizer(
    await updateOrganizerEvent(eventId, organizerId, input),
    organizerId,
  );

  if (!detail) {
    throw new ValidationError('Event not found', 404);
  }

  return detail;
}

export async function createEventEdition(
  eventId: string,
  input: EventWriteInput,
): Promise<TrailEventDetail> {
  validateRaces(input.races);
  const detail = await getEventByIdForAdmin(
    await insertEventEdition(eventId, input),
  );

  if (!detail) {
    throw new ValidationError('Event not found', 404);
  }

  return detail;
}

export async function removeAdminEvent(eventId: string): Promise<void> {
  const detail = await getEventByIdForAdmin(eventId);
  if (!detail) {
    throw new ValidationError('Event not found', 404);
  }

  await deleteEventForAdmin(eventId);
  revalidateHomepages('admin-event-delete');
  revalidateEventRelatedPages(detail, 'admin-event-delete');
}
