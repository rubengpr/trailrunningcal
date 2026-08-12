import { createAdminClient } from '@/lib/supabase/server';
import type { TrackGeometry } from '@/types/race-track.types';

export interface RaceTrackTarget {
  id: string;
  name: string;
}

export async function findRaceTrackTargets(
  eventSlug: string,
  raceName: string,
): Promise<RaceTrackTarget[]> {
  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', eventSlug)
    .maybeSingle();

  if (eventError) {
    console.error('Failed to resolve track import event:', eventError);
    throw new Error('Failed to resolve event');
  }

  if (!event) return [];

  const { data, error } = await supabase
    .from('races')
    .select('id, name')
    .eq('event_id', event.id)
    .eq('name', raceName)
    .limit(2);

  if (error) {
    console.error('Failed to resolve track import race:', error);
    throw new Error('Failed to resolve race');
  }

  return (data ?? []).flatMap((race) =>
    typeof race.name === 'string' ? [{ id: race.id, name: race.name }] : [],
  );
}

export async function updateRaceTrackGeometry(
  raceId: string,
  geometry: TrackGeometry,
): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('races')
    .update({ track_geometry: geometry })
    .eq('id', raceId)
    .select('id')
    .single();

  if (error || !data) {
    console.error('Failed to update race track geometry:', error);
    throw new Error('Failed to update race track');
  }
}
