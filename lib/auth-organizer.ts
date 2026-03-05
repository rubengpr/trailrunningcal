import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrailRace } from '@/types/race.types';
import { raceRowToTrailRace } from '@/lib/db/races';
import type { RaceRow } from '@/types/race.types';

export interface OrganizerRaceContext {
  organizerId: string;
  race: TrailRace;
}

/**
 * Resolves the current user's organizer and verifies they own the given race.
 * Use in API routes before any mutation on a race.
 */
export async function getOrganizerRaceContext(
  supabase: SupabaseClient,
  raceId: string,
): Promise<OrganizerRaceContext | null> {
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

  const { data: raceRow, error: raceError } = await supabase
    .from('races')
    .select('*')
    .eq('id', raceId)
    .single();

  if (raceError || !raceRow) {
    return null;
  }

  const row = raceRow as RaceRow;
  if (row.organizer_id !== organizer.id) {
    return null;
  }

  return {
    organizerId: organizer.id,
    race: raceRowToTrailRace(row),
  };
}
