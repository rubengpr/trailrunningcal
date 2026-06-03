import { cache } from 'react';
import { createAdminClient, createStaticClient } from '@/lib/supabase/server';
import type {
  EventRaceRow,
  EventRow,
  EventWithRacesRow,
  TrailEvent,
  TrailEventDetail,
  TrailEventRace,
} from '@/types/event.types';
import { buildEventDetail } from '@/lib/events/utils';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEventRaceRow(value: unknown): value is EventRaceRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.date === 'string' || value.date === null) &&
    typeof value.distance_km === 'number' &&
    (typeof value.elevation_gain_m === 'number' || value.elevation_gain_m === null) &&
    typeof value.city === 'string' &&
    typeof value.province === 'string' &&
    (typeof value.map_url === 'string' || value.map_url === null || value.map_url === undefined)
  );
}

function getEventRaceRows(races: unknown): EventRaceRow[] {
  if (!Array.isArray(races)) {
    return [];
  }

  return races.filter(isEventRaceRow);
}

export function toTrailEvent(row: EventRow): TrailEvent {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.website_url ?? null,
    organizerId: row.organizer_id ?? null,
    description: row.description ?? null,
    heroImageFilename: row.hero_image_filename ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function toTrailEventRace(row: EventRaceRow): TrailEventRace {
  return {
    id: row.id,
    name: row.name,
    date: row.date ?? null,
    distanceKm: row.distance_km,
    elevationGainM: row.elevation_gain_m ?? null,
    city: row.city,
    province: row.province,
    mapUrl: row.map_url ?? null,
    priceEur: row.race_tiers ?? null,
  };
}

export const getEvents = cache(async function getEvents(): Promise<TrailEventDetail[]> {
  const supabase = createStaticClient();

  const { data, error } = await supabase.rpc('get_events_with_races');

  if (error || !data) {
    console.error('Failed to fetch events with races:', error);
    return [];
  }

  return (data as EventWithRacesRow[]).map((row) => {
    const event = toTrailEvent(row);
    const raceRows = getEventRaceRows(row.races);
    const races = raceRows.map(toTrailEventRace);
    return buildEventDetail(event, races);
  });
});

export const getEventBySlug = cache(async function getEventBySlug(
  slug: string,
): Promise<TrailEventDetail | null> {
  const supabase = createStaticClient();

  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select(
      `
      id,
      name,
      slug,
      website_url,
      organizer_id,
      description,
      hero_image_filename,
      updated_at
    `,
    )
    .eq('slug', slug)
    .maybeSingle();

  if (eventError || !eventData) {
    if (eventError) {
      console.error('Failed to fetch event by slug:', eventError);
    }
    return null;
  }

  const event = toTrailEvent(eventData as EventRow);

  const { data: raceData, error: raceError } = await supabase
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
      map_url,
      race_tiers ( price_eur )
    `,
    )
    .eq('event_id', event.id);

  if (raceError || !raceData) {
    console.error('Failed to fetch event races:', raceError);
    return null;
  }

  return buildEventDetail(event, (raceData as EventRaceRow[]).map(toTrailEventRace));
});

export async function getEventByIdForAdmin(
  eventId: string,
): Promise<TrailEventDetail | null> {
  const supabase = createAdminClient();

  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select(
      `
      id,
      name,
      slug,
      website_url,
      organizer_id,
      description,
      hero_image_filename,
      updated_at
    `,
    )
    .eq('id', eventId)
    .single();

  if (eventError || !eventData) {
    if (eventError) {
      console.error('Failed to fetch event by id:', eventError);
    }
    return null;
  }

  const event = toTrailEvent(eventData as EventRow);

  const { data: raceData, error: raceError } = await supabase
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
      map_url,
      race_tiers ( price_eur )
    `,
    )
    .eq('event_id', event.id);

  if (raceError || !raceData) {
    console.error('Failed to fetch event races by event id:', raceError);
    return null;
  }

  return buildEventDetail(event, (raceData as EventRaceRow[]).map(toTrailEventRace));
}

export async function updateEventDescriptionForAdmin(
  eventId: string,
  description: string | null,
): Promise<TrailEvent> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('events')
    .update({
      description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select(
      `
      id,
      name,
      slug,
      website_url,
      organizer_id,
      description,
      hero_image_filename,
      updated_at
    `,
    )
    .single();

  if (error || !data) {
    console.error('Failed to update event description:', error);
    throw new Error('Failed to update event description');
  }

  return toTrailEvent(data as EventRow);
}

export const getRecommendedEvents = cache(async function getRecommendedEvents(
  province: string,
  excludeEventId: string,
  afterDate: string | null,
  limit: number = 7,
): Promise<TrailEventDetail[]> {
  const lowerBoundDate = afterDate ?? new Date().toISOString().slice(0, 10);
  const supabase = createStaticClient();

  const { data, error } = await supabase.rpc('get_recommended_events', {
    p_province: province,
    p_exclude_event_id: excludeEventId,
    p_after_date: lowerBoundDate,
    p_limit: limit,
  });

  if (error || !data) {
    console.error('Failed to fetch recommended events:', error);
    return [];
  }

  return (data as EventWithRacesRow[]).map((row) => {
    const event = toTrailEvent(row);
    const races = getEventRaceRows(row.races).map(toTrailEventRace);

    return buildEventDetail(event, races);
  });
});
