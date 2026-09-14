import { unstable_cache } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import {
  createAdminClient,
  createStaticClient,
} from '@/lib/supabase/server';
import { selectRelevantEventRaces } from '@/lib/events/utils';
import { buildTrackRoutes, toTrackGeometry } from '@/lib/race-tracks/routes';
import type { Locale } from '@/i18n';
import type { TrailEventRaceWithTrack } from '@/types/event.types';
import type { TrackGeometry, TrackRoute } from '@/types/race-track.types';

export interface RaceTrackTarget {
  id: string;
  name: string;
}

export interface RaceTrackTargetById {
  id: string;
  eventId: string;
  eventSlug: string;
}

export async function getTrackedRaceIdsForEvent(
  eventId: string,
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('races')
    .select('id')
    .eq('event_id', eventId)
    .not('track_geometry', 'is', null);

  if (error) {
    console.error('Failed to load event track statuses:', error);
    throw new Error('Failed to load event track statuses');
  }

  return (data ?? []).map((race) => race.id);
}

export async function getPublicTrackedRaceIdsForEvent(
  eventId: string,
): Promise<string[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from('races')
    .select('id')
    .eq('event_id', eventId)
    .not('track_geometry', 'is', null);

  if (error) {
    console.error('Failed to load public event track statuses:', error);
    throw new Error('Failed to load event track statuses');
  }

  return (data ?? []).map((race) => race.id);
}

async function getEventTrackRoutesUncached(
  eventId: string,
  locale: Locale,
): Promise<TrackRoute[] | null> {
  const supabase = createStaticClient();
  const [
    { data: event, error: eventError },
    { data: raceData, error: raceError },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .maybeSingle(),
    supabase
      .from('races')
      .select('id, name, date, distance_km')
      .eq('event_id', eventId)
      .not('track_geometry', 'is', null),
  ]);

  if (eventError) {
    console.error('Failed to load event tracks:', eventError);
    throw new Error('Failed to load event tracks');
  }
  if (!event) return null;

  if (raceError) {
    console.error('Failed to load event track metadata:', raceError);
    throw new Error('Failed to load event tracks');
  }

  const races = (raceData ?? []).map<TrailEventRaceWithTrack>((race) => ({
    id: race.id,
    name: race.name,
    date: race.date,
    distanceKm: race.distance_km,
    elevationGainM: null,
    city: '',
    province: '',
    mapUrl: null,
    resultsUrl: null,
    tiers: [],
    trackGeometry: null,
  }));
  const relevantRaces = selectRelevantEventRaces(races);
  if (relevantRaces.length === 0) return [];

  const { data: geometryData, error: geometryError } = await supabase
    .from('races')
    .select('id, track_geometry')
    .in('id', relevantRaces.map((race) => race.id));

  if (geometryError) {
    console.error('Failed to load event track geometry:', geometryError);
    throw new Error('Failed to load event tracks');
  }

  const geometryByRaceId = new Map(
    (geometryData ?? []).flatMap((race) => {
      const geometry = toTrackGeometry(race.track_geometry);
      return geometry ? [[race.id, geometry] as const] : [];
    }),
  );
  const t = await getTranslations({ locale, namespace: 'event.trackMap' });

  return buildTrackRoutes(
    relevantRaces.flatMap((race) => {
      const geometry = geometryByRaceId.get(race.id);
      return geometry
        ? [{
            raceId: race.id,
            raceName: race.name ?? t('unnamedRoute', {
              eventName: event.name,
              distance: race.distanceKm,
            }),
            distanceKm: race.distanceKm,
            geometry,
          }]
        : [];
    }),
  );
}

export async function getEventTrackRoutes(
  eventId: string,
  locale: Locale,
): Promise<TrackRoute[] | null> {
  return unstable_cache(
    () => getEventTrackRoutesUncached(eventId, locale),
    ['event-track-routes', eventId, locale],
    {
      revalidate: 86400,
      tags: [`event-track-routes:${eventId}`],
    },
  )();
}

export async function getTrackedRaceIdsByEventIds(
  eventIds: string[],
): Promise<Map<string, string[]>> {
  if (eventIds.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('races')
    .select('id, event_id')
    .in('event_id', eventIds)
    .not('track_geometry', 'is', null);

  if (error) {
    console.error('Failed to load event track statuses:', error);
    throw new Error('Failed to load event track statuses');
  }

  const raceIdsByEventId = new Map<string, string[]>();
  for (const race of data ?? []) {
    const raceIds = raceIdsByEventId.get(race.event_id) ?? [];
    raceIds.push(race.id);
    raceIdsByEventId.set(race.event_id, raceIds);
  }

  return raceIdsByEventId;
}

export async function findRaceTrackTargetById(
  raceId: string,
): Promise<RaceTrackTargetById | null> {
  const supabase = createAdminClient();
  const { data: race, error: raceError } = await supabase
    .from('races')
    .select('id, event_id')
    .eq('id', raceId)
    .maybeSingle();

  if (raceError) {
    console.error('Failed to resolve race track target:', raceError);
    throw new Error('Failed to resolve race');
  }

  if (!race) return null;

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('slug')
    .eq('id', race.event_id)
    .maybeSingle();

  if (eventError || !event) {
    console.error('Failed to resolve race track event:', eventError);
    throw new Error('Failed to resolve event');
  }

  return { id: race.id, eventId: race.event_id, eventSlug: event.slug };
}

export async function findRaceTrackTargets(
  eventSlug: string,
  raceName: string,
): Promise<RaceTrackTarget[]> {
  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', eventSlug)
    .maybeSingle();

  if (eventError) {
    console.error('Failed to resolve track import event:', eventError);
    throw new Error('Failed to resolve event');
  }

  if (!event) return [];

  const { data, error } = await supabase
    .from('races')
    .select('id, name')
    .eq('event_id', event.id)
    .eq('name', raceName)
    .limit(2);

  if (error) {
    console.error('Failed to resolve track import race:', error);
    throw new Error('Failed to resolve race');
  }

  return (data ?? []).flatMap((race) =>
    typeof race.name === 'string' ? [{ id: race.id, name: race.name }] : [],
  );
}

export async function updateRaceTrackGeometry(
  raceId: string,
  geometry: TrackGeometry,
): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('races')
    .update({ track_geometry: geometry })
    .eq('id', raceId)
    .select('id')
    .single();

  if (error || !data) {
    console.error('Failed to update race track geometry:', error);
    throw new Error('Failed to update race track');
  }
}
