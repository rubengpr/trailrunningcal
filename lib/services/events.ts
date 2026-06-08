import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import { getEventByIdForAdmin } from '@/lib/db/events';
import type { TrailEventDetail } from '@/types/event.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

export interface EventWithRacesInput {
  event: TrailEventAgentEvent;
  races: TrailEventAgentRace[];
}

export interface UpdateEventWithRacesInput {
  event: TrailEventAgentEvent;
  races: Array<TrailEventAgentRace & { id?: string }>;
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
    p_races: input.races.map((race) => ({
      name: race.name,
      date: race.date,
      city: race.city,
      province: race.province,
      distance_km: race.distanceKm,
      elevation_gain_m: race.elevationGainM,
    })),
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
    p_races: input.races.map((race) => ({
      id: race.id ?? null,
      name: race.name,
      date: race.date,
      city: race.city,
      province: race.province,
      distance_km: race.distanceKm,
      elevation_gain_m: race.elevationGainM,
    })),
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
    p_races: input.races.map((race) => ({
      name: race.name,
      date: race.date,
      city: race.city,
      province: race.province,
      distance_km: race.distanceKm,
      elevation_gain_m: race.elevationGainM,
    })),
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
