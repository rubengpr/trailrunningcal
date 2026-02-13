import { createClient, createStaticClient } from '@/lib/supabase/server';
import type { TrailRace, RaceRow } from '@/types/race.types';

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
  };
}

let racesCache: TrailRace[] | null = null;

/**
 * Fetches all races from the database
 * @param useStaticClient - If true, uses the static client (for build-time static generation).
 *                          If false or undefined, uses the regular client with cookies (for server components).
 * @returns Array of TrailRace objects
 */
export async function getRaces(
  useStaticClient?: boolean,
): Promise<TrailRace[]> {
  if (racesCache) return racesCache;

  // Use static client for static generation contexts (generateStaticParams, generateMetadata)
  // Use regular client for server components that need cookies/auth
  const supabase = useStaticClient
    ? createStaticClient()
    : await createClient();

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
      race_tiers ( price_eur )
    `,
    )
    .order('date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Failed to fetch races:', error);
    racesCache = [];
    return racesCache;
  }

  const rows = (data ?? []) as RaceRow[];
  racesCache = rows.map(raceRowToTrailRace);

  return racesCache;
}
