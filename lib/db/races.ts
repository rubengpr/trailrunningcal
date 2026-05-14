import { cache } from 'react';
import { createClient, createAdminClient, createStaticClient } from '@/lib/supabase/server';
import type { TrailRace, RaceRow, ConflictingRace } from '@/types/race.types';
import { generateRaceSlug } from '@/lib/races/utils';

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

let racesCache: TrailRace[] | null = null;

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
  racesCache = rows.map(toTrailRace);
  return racesCache;
});

const RACE_SELECT = `
  id, name, date, distance_km, elevation_gain_m,
  city, province, organizer_id, description,
  map_url, website_url, hero_image_filename,
  race_tiers ( price_eur )
` as const;

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

  return toTrailRace(data as RaceRow);
});

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

  return (data as RaceRow[]).map(toTrailRace);
});

export async function getFutureRacesByUrl(urls: string[]): Promise<ConflictingRace[]> {
  const supabase = createStaticClient();
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

  return (data ?? []).map((row: { id: string; name: string; date: string; website_url: string }) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    websiteUrl: row.website_url,
  }));
}

export async function getRaceById(
  raceId: string,
  useAdmin: boolean,
): Promise<{ name: string; province: string; distance_km: number; elevation_gain_m: number | null } | null> {
  const dbClient = useAdmin ? createAdminClient() : await createClient();

  const { data, error } = await dbClient
    .from('races')
    .select('name, province, distance_km, elevation_gain_m')
    .eq('id', raceId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateRace(
  raceId: string,
  fields: Record<string, unknown>,
  useAdmin: boolean,
) {
  const dbClient = useAdmin ? createAdminClient() : await createClient();

  const { data, error } = await dbClient
    .from('races')
    .update(fields)
    .eq('id', raceId)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to update race');
  }

  return data;
}

export async function deleteRace(
  raceId: string,
  useAdmin: boolean,
  organizerId?: string,
) {
  const dbClient = useAdmin ? createAdminClient() : await createClient();

  let query = dbClient.from('races').delete().eq('id', raceId);
  if (organizerId) {
    query = query.eq('organizer_id', organizerId);
  }

  const { error } = await query;

  if (error) {
    console.error('Delete error:', error);
    throw new Error('Failed to delete race');
  }
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

export type CreateRaceParams = {
  name: string;
  date: string;
  distanceKm: number;
  elevationGainM: number | null;
  priceEur: number | null;
  websiteUrl: string;
  city: string;
  province: string;
  description: string | null;
  organizerId: string | null;
};

export async function insertRace(
  params: CreateRaceParams,
  useAdmin: boolean,
): Promise<string> {
  const dbClient = useAdmin ? createAdminClient() : await createClient();

  const { data, error } = await dbClient.rpc('create_race_with_tier', {
    p_name: params.name,
    p_date: params.date,
    p_distance_km: params.distanceKm,
    p_elevation_gain_m: params.elevationGainM,
    p_website_url: params.websiteUrl,
    p_city: params.city,
    p_province: params.province,
    p_description: params.description,
    p_organizer_id: params.organizerId,
    p_price_eur: params.priceEur,
  });

  if (error || !data) {
    console.error('Create race transaction error:', error);
    throw new Error('Failed to create race');
  }

  return data as string;
}
