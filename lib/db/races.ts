import { cache } from 'react';
import {
  createAdminClient,
  createClient,
  createStaticClient,
} from '@/lib/supabase/server';
import type { TrailRace, RaceRow, ConflictingRace } from '@/types/race.types';

export function toTrailRace(row: RaceRow): TrailRace {
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

function getJoinedEventSlug(value: unknown): string | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'slug' in value &&
    typeof value.slug === 'string'
  ) {
    return value.slug;
  }

  return null;
}

export const getEventSlugByRaceLegacySlug = cache(
  async function getEventSlugByRaceLegacySlug(
    legacySlug: string,
  ): Promise<string | null> {
    const supabase = createStaticClient();

    const { data, error } = await supabase
      .from('races')
      .select('events ( slug )')
      .eq('legacy_slug', legacySlug)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error('Failed to fetch event slug by race legacy slug:', error);
      }
      return null;
    }

    return getJoinedEventSlug((data as { events?: unknown }).events);
  },
);

export async function getFutureRacesByUrl(
  urls: string[],
): Promise<ConflictingRace[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('races')
    .select('id, name, date, website_url')
    .in('website_url', urls)
    .gt('date', today);

  if (error) {
    console.error('Failed to fetch URL conflicts:', error);
    return [];
  }

  return (data ?? []).map(
    (row: { id: string; name: string; date: string; website_url: string }) => ({
      id: row.id,
      name: row.name,
      date: row.date,
      websiteUrl: row.website_url,
    }),
  );
}

export async function getRaceName(
  raceId: string,
  useAdmin: boolean,
): Promise<string | null> {
  const dbClient = useAdmin ? createAdminClient() : await createClient();

  const { data } = await dbClient
    .from('races')
    .select('name')
    .eq('id', raceId)
    .single();

  return data?.name ?? null;
}
