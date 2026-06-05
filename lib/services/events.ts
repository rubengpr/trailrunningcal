import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

export interface CreateEventWithRacesInput {
  event: TrailEventAgentEvent;
  races: TrailEventAgentRace[];
}

export async function createEventWithRaces(
  input: CreateEventWithRacesInput,
): Promise<{ id: string }> {
  if (input.races.length === 0) {
    throw new ValidationError('At least one race is required', 400);
  }

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
