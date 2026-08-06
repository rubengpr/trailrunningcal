import { createStaticClient } from '@/lib/supabase/server';
import type {
  EventMapLocation,
  EventMapLocationKey,
} from '@/types/map.types';

export async function getPublicEventLocations(
  locations: EventMapLocationKey[],
): Promise<EventMapLocation[]> {
  if (locations.length === 0) return [];

  const supabase = createStaticClient();
  const { data, error } = await supabase.rpc('get_public_event_locations', {
    p_locations: locations,
  });

  if (error) {
    console.error('Failed to fetch public event locations:', error);
    throw new Error('Failed to fetch public event locations');
  }

  return (data ?? []) as EventMapLocation[];
}
