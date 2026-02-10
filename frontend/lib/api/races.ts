import { createClient, createStaticClient } from '@/lib/supabase/server';
import type { TrailRace, PriceValue } from '@/types/race.types';

// Shape of a row in the `races` table as returned by Supabase
type RaceRow = {
  id: string;
  name: string;
  date: string | null;
  distance_km: number;
  elevation_gain_m: number | null;
  price_eur?: PriceValue | null;
  city: string;
  province: string;
  description: string | null;
  map_url?: string | null;
  image_path?: string | null;
  services?: string[] | null;
  results_urls?: Array<{ year: number; url: string }> | null;
  sponsors?: string[] | null;
  organizer_id: string | null;
  website_url?: string | null;
};

let racesCache: TrailRace[] | null = null;

/**
 * Fetches all races from the database
 * Automatically detects if called from a static context (build time) and uses
 * the appropriate Supabase client (static client without cookies for build time,
 * regular client with cookies for server components).
 * @returns Array of TrailRace objects
 */
export async function getRaces(): Promise<TrailRace[]> {
  if (racesCache) return racesCache;

  // Try to use the regular client first (for server components with cookies)
  // If cookies() is not available (static generation), fall back to static client
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    // If cookies() throws an error (e.g., "cookies was called outside a request scope"),
    // we're in a static generation context, so use the static client
    supabase = createStaticClient();
  }

  const { data, error } = await supabase
    .from('races')
    .select('*')
    .order('date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Failed to fetch races:', error);
    racesCache = [];
    return racesCache;
  }

  const rows = (data ?? []) as RaceRow[];

  // Map database snake_case to TypeScript camelCase
  racesCache = rows.map(
    (race): TrailRace => ({
      id: race.id,
      name: race.name,
      date: race.date ?? null,
      distanceKm: race.distance_km,
      elevationGainM: race.elevation_gain_m ?? null,
      priceEur: race.price_eur ?? null,
      city: race.city,
      province: race.province,
      description: race.description ?? null,
      mapUrl: race.map_url ?? null,
      imagePath: race.image_path ?? null,
      services: race.services ?? null,
      resultsUrls: race.results_urls ?? null,
      sponsors: race.sponsors ?? null,
      organizerId: race.organizer_id ?? null,
      websiteUrl: race.website_url ?? null,
    }),
  );

  return racesCache;
}
