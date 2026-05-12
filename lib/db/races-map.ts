import { cache } from 'react';
import { createStaticClient } from '@/lib/supabase/server';
import { generateRaceSlug } from '@/lib/races/utils';
import type { RaceMapMarker, RaceMapPinRace, RacesMapResponse } from '@/types/map.types';

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function cityProvinceKey(city: string, province: string): string {
  return `${city}|${province}`;
}

type RaceMapQueryRow = {
  id: string;
  name: string;
  date: string;
  distance_km: number;
  elevation_gain_m: number | null;
  city: string;
  province: string;
};

type GroupValue = {
  city: string;
  province: string;
  races: RaceMapPinRace[];
};

export const getRacesMapData = cache(async function getRacesMapData(): Promise<RacesMapResponse> {
  const supabase = createStaticClient();

  const { data: locationRows, error: locError } = await supabase
    .from('city_locations')
    .select('city, province, latitude, longitude');

  if (locError) {
    console.error('Failed to fetch city_locations:', locError);
    return { markers: [] };
  }

  const today = getTodayDateString();

  const { data: raceRows, error: raceError } = await supabase
    .from('races')
    .select('id, name, date, distance_km, elevation_gain_m, city, province')
    .not('date', 'is', null)
    .gte('date', today)
    .order('date', { ascending: true });

  if (raceError) {
    console.error('Failed to fetch races for map:', raceError);
    return { markers: [] };
  }

  const locationMap = new Map<string, { latitude: number; longitude: number }>();
  for (const row of locationRows ?? []) {
    locationMap.set(cityProvinceKey(row.city, row.province), {
      latitude: row.latitude,
      longitude: row.longitude,
    });
  }

  const grouped = new Map<string, GroupValue>();

  for (const row of (raceRows ?? []) as RaceMapQueryRow[]) {
    const key = cityProvinceKey(row.city, row.province);
    if (!locationMap.has(key)) continue;

    const pinRace: RaceMapPinRace = {
      id: row.id,
      name: row.name,
      date: row.date,
      distanceKm: row.distance_km,
      elevationGainM: row.elevation_gain_m ?? null,
      pathSegment: generateRaceSlug(row.name),
    };

    const existing = grouped.get(key);
    if (existing) {
      existing.races.push(pinRace);
    } else {
      grouped.set(key, {
        city: row.city,
        province: row.province,
        races: [pinRace],
      });
    }
  }

  const markers: RaceMapMarker[] = [];

  for (const [key, { city, province, races }] of grouped) {
    const coords = locationMap.get(key);
    if (!coords || races.length === 0) continue;

    markers.push({
      city,
      province,
      latitude: coords.latitude,
      longitude: coords.longitude,
      races,
    });
  }

  return { markers };
});
