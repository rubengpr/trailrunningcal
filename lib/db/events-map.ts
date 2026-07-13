import { cache } from 'react';
import { createStaticClient } from '@/lib/supabase/server';
import type { EventMapLocation } from '@/types/map.types';

export const getEventMapLocations = cache(async function getEventMapLocations(): Promise<EventMapLocation[]> {
  const supabase = createStaticClient();

  const { data: locationRows, error: locError } = await supabase
    .from('city_locations')
    .select('city, province, latitude, longitude');

  if (locError) {
    console.error('Failed to fetch city_locations:', locError);
    return [];
  }

  return locationRows ?? [];
});
