import { createAdminClient, createClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import { getEventByIdForAdmin, getEventByIdForOrganizer } from '@/lib/db/events';
import type {
  EventRaceTierWriteInput,
  TrailEventDetail,
} from '@/types/event.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

export type EventRaceWriteInput = Omit<TrailEventAgentRace, 'name'> & {
  name: string | null;
  id?: string;
  tiers: EventRaceTierWriteInput[];
};

function toRacePayload(race: EventRaceWriteInput): Record<string, unknown> {
  return {
    ...(race.id ? { id: race.id } : {}),
    name: race.name,
    date: race.date,
    city: race.city,
    province: race.province,
    distance_km: race.distanceKm,
    elevation_gain_m: race.elevationGainM,
    tiers: race.tiers.map((tier) => ({
      price_eur: tier.priceEur,
      ends_at: tier.endsAt,
    })),
  };
}

export interface EventWithRacesInput {
  event: TrailEventAgentEvent;
  races: EventRaceWriteInput[];
}

export interface UpdateEventWithRacesInput {
  event: TrailEventAgentEvent;
  races: EventRaceWriteInput[];
}

export async function createEventWithRaces(
  input: EventWithRacesInput,
): Promise<{ id: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('create_event_with_races', {
    p_event: {
      name: input.event.name,
      description: input.event.description,
      website_url: input.event.websiteUrl,
    },
    p_races: input.races.map(toRacePayload),
  });

  if (error || !data) {
    console.error('Create event with races transaction error:', error);
    throw new Error('Failed to create event');
  }

  return { id: data as string };
}

export async function updateEventWithRaces(
  eventId: string,
  input: UpdateEventWithRacesInput,
): Promise<TrailEventDetail> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('update_event_with_races', {
    p_event_id: eventId,
    p_event: {
      name: input.event.name,
      description: input.event.description,
      website_url: input.event.websiteUrl,
    },
    p_races: input.races.map(toRacePayload),
  });

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

  const detail = await getEventByIdForAdmin(data as string);

  if (!detail) {
    throw new ValidationError('Event not found', 404);
  }

  return detail;
}

export async function updateOrganizerEventWithRaces(
  eventId: string,
  organizerId: string,
  input: UpdateEventWithRacesInput,
): Promise<TrailEventDetail> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('update_organizer_event_with_races', {
    p_event_id: eventId,
    p_organizer_id: organizerId,
    p_event: {
      name: input.event.name,
      description: input.event.description,
      website_url: input.event.websiteUrl,
    },
    p_races: input.races.map(toRacePayload),
  });

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

  const detail = await getEventByIdForOrganizer(data as string, organizerId);

  if (!detail) {
    throw new ValidationError('Event not found', 404);
  }

  return detail;
}

export async function createEventEdition(
  eventId: string,
  input: EventWithRacesInput,
): Promise<TrailEventDetail> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('create_event_edition', {
    p_event_id: eventId,
    p_event: {
      name: input.event.name,
      description: input.event.description,
      website_url: input.event.websiteUrl,
    },
    p_races: input.races.map(toRacePayload),
  });

  if (error || !data) {
    if (error?.code === 'P0002') {
      throw new ValidationError('Event not found', 404);
    }

    console.error('Create event edition transaction error:', error);
    throw new Error('Failed to create event edition');
  }

  const detail = await getEventByIdForAdmin(data as string);

  if (!detail) {
    throw new ValidationError('Event not found', 404);
  }

  return detail;
}
