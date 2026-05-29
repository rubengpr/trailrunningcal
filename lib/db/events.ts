import { cache } from 'react';
import { createStaticClient } from '@/lib/supabase/server';
import type {
  EventRaceRow,
  EventRow,
  TrailEvent,
  TrailEventDetail,
  TrailEventRace,
} from '@/types/event.types';
import {
  buildEventDateRange,
  buildEventLocation,
  selectRelevantEventRaces,
} from '@/lib/events/utils';

export function toTrailEvent(row: EventRow): TrailEvent {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.website_url ?? null,
    organizerId: row.organizer_id ?? null,
    description: row.description ?? null,
    heroImageFilename: row.hero_image_filename ?? null,
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
      hero_image_filename
    `,
    )
    .eq('slug', slug)
    .single();

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

  const allRaces = (raceData as EventRaceRow[]).map(toTrailEventRace);
  const races = selectRelevantEventRaces(allRaces);

  return {
    event,
    races,
    allRaceCount: allRaces.length,
    dateRange: buildEventDateRange(races),
    location: buildEventLocation(races),
  };
});
