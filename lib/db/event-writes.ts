import { createAdminClient, createClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type {
  EventRaceWriteInput,
  EventWriteInput,
} from '@/types/event-write.types';

function toRacePayload(race: EventRaceWriteInput): Record<string, unknown> {
  return {
    ...(race.id ? { id: race.id } : {}),
    name: race.name,
    date: race.date,
    city: race.city,
    province: race.province,
    distance_km: race.distanceKm,
    elevation_gain_m: race.elevationGainM,
    ...(race.resultsUrl !== undefined
      ? { results_url: race.resultsUrl }
      : {}),
    tiers: race.tiers.map((tier) => ({
      price_eur: tier.priceEur,
      ends_at: tier.endsAt,
    })),
  };
}

function toEventPayload(input: EventWriteInput) {
  return {
    p_event: {
      name: input.event.name,
      description: input.event.description,
      website_url: input.event.websiteUrl,
    },
    p_races: input.races.map(toRacePayload),
  };
}

export async function insertEvent(input: EventWriteInput): Promise<string> {
  const { data, error } = await createAdminClient().rpc(
    'create_event_with_results',
    toEventPayload(input),
  );

  if (error || !data) {
    console.error('Create event with races transaction error:', error);
    throw new Error('Failed to create event');
  }

  return data as string;
}

export async function updateEvent(
  eventId: string,
  input: EventWriteInput,
): Promise<string> {
  const { data, error } = await createAdminClient().rpc(
    'update_event_with_results',
    { p_event_id: eventId, ...toEventPayload(input) },
  );

  if (error || !data) {
    if (error?.code === 'P0002') {
      throw new ValidationError('Event not found', 404);
    }
    if (error?.code === 'P0003') {
      throw new ValidationError('Race does not belong to event', 400);
    }
    console.error('Update event with races transaction error:', error);
    throw new Error('Failed to update event');
  }

  return data as string;
}

export async function updateOrganizerEvent(
  eventId: string,
  organizerId: string,
  input: EventWriteInput,
): Promise<string> {
  const { data, error } = await (await createClient()).rpc(
    'update_organizer_event_with_results',
    {
      p_event_id: eventId,
      p_organizer_id: organizerId,
      ...toEventPayload(input),
    },
  );

  if (error || !data) {
    if (error?.code === 'P0002') {
      throw new ValidationError('Event not found', 404);
    }
    if (error?.code === 'P0003') {
      throw new ValidationError('Race does not belong to event', 400);
    }
    if (error?.code === 'P0004') {
      throw new ValidationError('Forbidden', 403);
    }
    console.error('Update organizer event with races transaction error:', error);
    throw new Error('Failed to update event');
  }

  return data as string;
}

export async function insertEventEdition(
  eventId: string,
  input: EventWriteInput,
): Promise<string> {
  const { data, error } = await createAdminClient().rpc(
    'create_event_edition_with_results',
    { p_event_id: eventId, ...toEventPayload(input) },
  );

  if (error || !data) {
    if (error?.code === 'P0002') {
      throw new ValidationError('Event not found', 404);
    }
    console.error('Create event edition transaction error:', error);
    throw new Error('Failed to create event edition');
  }

  return data as string;
}
