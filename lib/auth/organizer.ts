import type { SupabaseClient } from '@supabase/supabase-js';
import { getEventByIdForOrganizer } from '@/lib/db/events';
import type { TrailRace } from '@/types/race.types';
import { toTrailRace } from '@/lib/db/races';
import type { TrailEventDetail } from '@/types/event.types';
import type { RaceRow } from '@/types/race.types';

export interface OrganizerRaceContext {
  organizerId: string;
  race: TrailRace;
}

export interface OrganizerEventContext {
  organizerId: string;
  event: TrailEventDetail;
}

async function getOrganizerIdForUser(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: organizer, error: organizerError } = await supabase
    .from('organizers')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (organizerError || !organizer) {
    return null;
  }

  return organizer.id;
}

export async function getOrganizerRaceContext(
  supabase: SupabaseClient,
  raceId: string,
): Promise<OrganizerRaceContext | null> {
  const organizerId = await getOrganizerIdForUser(supabase);
  if (!organizerId) {
    return null;
  }

  const { data: raceRow, error: raceError } = await supabase
    .from('races')
    .select('*')
    .eq('id', raceId)
    .single();

  if (raceError || !raceRow) {
    return null;
  }

  const row = raceRow as RaceRow;
  if (row.organizer_id !== organizerId) {
    return null;
  }

  return {
    organizerId,
    race: toTrailRace(row),
  };
}

export async function getOrganizerEventContext(
  supabase: SupabaseClient,
  eventId: string,
): Promise<OrganizerEventContext | null> {
  const organizerId = await getOrganizerIdForUser(supabase);
  if (!organizerId) {
    return null;
  }

  const event = await getEventByIdForOrganizer(eventId, organizerId);
  if (!event) {
    return null;
  }

  return {
    organizerId,
    event,
  };
}

export async function getRaceAccessContext(
  supabase: SupabaseClient,
  raceId: string,
  isAdmin: boolean,
): Promise<OrganizerRaceContext | null> {
  if (!isAdmin) {
    return getOrganizerRaceContext(supabase, raceId);
  }

  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('id', raceId)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as RaceRow;
  if (!row.organizer_id) {
    return null;
  }

  return {
    organizerId: row.organizer_id,
    race: toTrailRace(row),
  };
}
