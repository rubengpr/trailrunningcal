import { cache } from 'react';
import { createStaticClient } from '@/lib/supabase/server';
import type { TrailRace, RaceRow } from '@/types/race.types';
import { generateRaceSlug } from '@/lib/race-utils';

export function raceRowToTrailRace(row: RaceRow): TrailRace {
  return {
    id: row.id,
    name: row.name,
    date: row.date ?? null,
    distanceKm: row.distance_km,
    elevationGainM: row.elevation_gain_m ?? null,
    priceEur: row.race_tiers ?? null,
    city: row.city,
    province: row.province,
    description: row.description ?? null,
    mapUrl: row.map_url ?? null,
    imagePath: row.image_path ?? null,
    services: row.services ?? null,
    resultsUrls: row.results_urls ?? null,
    sponsors: row.sponsors ?? null,
    organizerId: row.organizer_id ?? null,
    websiteUrl: row.website_url ?? null,
    heroImageFilename: row.hero_image_filename ?? null,
  };
}

let racesCache: TrailRace[] | null = null;

/**
 * Fetches all races from the database using the static client (no cookies).
 * Safe for use in all public pages and ISR — does not force dynamic rendering.
 * @returns Array of TrailRace objects
 */
export const getRaces = cache(async function getRaces(): Promise<TrailRace[]> {
  if (racesCache) return racesCache;

  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from('races')
    .select(
      `
      id,
      name,
      date,
      distance_km,
      elevation_gain_m,
      city,
      province,
      organizer_id,
      description,
      map_url,
      website_url,
      hero_image_filename,
      race_tiers ( price_eur )
    `,
    )
    .order('date', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch races:', error);
    racesCache = [];
    return [];
  }

  const rows = (data ?? []) as RaceRow[];
  racesCache = rows.map(raceRowToTrailRace);
  return racesCache;
});

const RACE_SELECT = `
  id, name, date, distance_km, elevation_gain_m,
  city, province, organizer_id, description,
  map_url, website_url, hero_image_filename,
  race_tiers ( price_eur )
` as const;

/**
 * Fetches a single race by its URL slug.
 * Does a lightweight lookup (id + name only) to find the matching race,
 * then fetches the full row for that single race.
 */
export const getRaceBySlug = cache(async function getRaceBySlug(
  slug: string,
): Promise<TrailRace | null> {
  const supabase = createStaticClient();

  const { data: nameRows, error: nameError } = await supabase
    .from('races')
    .select('id, name');

  if (nameError || !nameRows) {
    console.error('Failed to fetch race names:', nameError);
    return null;
  }

  const match = nameRows.find(
    (r: { id: string; name: string }) => generateRaceSlug(r.name) === slug,
  );

  if (!match) return null;

  const { data, error } = await supabase
    .from('races')
    .select(RACE_SELECT)
    .eq('id', match.id)
    .single();

  if (error || !data) {
    console.error('Failed to fetch race by id:', error);
    return null;
  }

  return raceRowToTrailRace(data as RaceRow);
});

/**
 * Fetches recommended races from the same province, ordered by date.
 * Returns up to `limit` races after the given date (or any dated races if date is null).
 */
export const getRecommendedRaces = cache(async function getRecommendedRaces(
  province: string,
  excludeId: string,
  afterDate: string | null,
  limit: number = 3,
): Promise<TrailRace[]> {
  const supabase = createStaticClient();

  let query = supabase
    .from('races')
    .select('id, name, date, distance_km, elevation_gain_m, city, province, organizer_id')
    .eq('province', province)
    .neq('id', excludeId)
    .not('date', 'is', null)
    .order('date', { ascending: true })
    .limit(limit);

  if (afterDate) {
    query = query.gte('date', afterDate);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Failed to fetch recommended races:', error);
    return [];
  }

  return (data as RaceRow[]).map(raceRowToTrailRace);
});
