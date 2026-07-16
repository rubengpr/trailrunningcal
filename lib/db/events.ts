import { cache } from 'react';
import {
  createAdminClient,
  createClient,
  createStaticClient,
} from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type {
  EventRaceRow,
  EventRaceWithEventIdRow,
  EventRow,
  EventWithRacesRow,
  AdminTrailEventDetail,
  PublicEventDetail,
  TrailEvent,
  TrailEventDetail,
  TrailEventRace,
  EventRaceTier,
} from '@/types/event.types';
import { buildEventDetail, toPublicEventDetail } from '@/lib/events/utils';
import { getPendingDraftsByEventIds } from '@/lib/db/event-drafts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEventRaceRow(value: unknown): value is EventRaceRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (typeof value.name === 'string' || value.name === null) &&
    (typeof value.date === 'string' || value.date === null) &&
    typeof value.distance_km === 'number' &&
    (typeof value.elevation_gain_m === 'number' ||
      value.elevation_gain_m === null) &&
    typeof value.city === 'string' &&
    typeof value.province === 'string' &&
    (typeof value.map_url === 'string' ||
      value.map_url === null ||
      value.map_url === undefined)
  );
}

function getEventRaceRows(races: unknown): EventRaceRow[] {
  if (!Array.isArray(races)) {
    return [];
  }

  return races.filter(isEventRaceRow);
}

function toEventDetails(rows: EventWithRacesRow[]): TrailEventDetail[] {
  return rows.map((row) => {
    const event = toTrailEvent(row);
    const races = getEventRaceRows(row.races).map(toTrailEventRace);
    return buildEventDetail(event, races);
  });
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
  const tiers = (row.race_tiers ?? [])
    .flatMap<EventRaceTier>((tier) =>
      tier.price_eur === null
        ? []
        : [{
            ...(typeof tier.id === 'string' ? { id: tier.id } : {}),
            endsAt: tier.ends_at ?? null,
            priceEur: tier.price_eur,
          }],
    )
    .sort((a, b) =>
      (a.endsAt ?? '9999-12-31').localeCompare(b.endsAt ?? '9999-12-31'),
    );

  return {
    id: row.id,
    name: row.name,
    date: row.date ?? null,
    distanceKm: row.distance_km,
    elevationGainM: row.elevation_gain_m ?? null,
    city: row.city,
    province: row.province,
    mapUrl: row.map_url ?? null,
    tiers,
  };
}

export const getEvents = cache(async function getEvents(): Promise<
  TrailEventDetail[]
> {
  const supabase = createStaticClient();

  const { data, error } = await supabase.rpc('get_events_with_races');

  if (error || !data) {
    console.error('Failed to fetch events with races:', error);
    return [];
  }

  return toEventDetails(data as EventWithRacesRow[]);
});

export const getUpcomingEvents = cache(async function getUpcomingEvents(
  afterDate: string,
): Promise<PublicEventDetail[]> {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      name,
      slug,
      races!inner (
        id,
        name,
        date,
        distance_km,
        elevation_gain_m,
        city,
        province
      )
    `,
    )
    .gt('races.date', afterDate);

  if (error || !data) {
    console.error('Failed to fetch upcoming events:', error);
    return [];
  }

  return (
    data as Array<Pick<EventRow, 'id' | 'name' | 'slug'> & { races: unknown }>
  ).map((row) => {
    const event: TrailEvent = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      websiteUrl: null,
      organizerId: null,
      description: null,
      heroImageFilename: null,
      updatedAt: null,
    };
    const races = getEventRaceRows(row.races).map(toTrailEventRace);

    return toPublicEventDetail(buildEventDetail(event, races));
  });
});

export const getEventsForAdmin = cache(
  async function getEventsForAdmin(): Promise<AdminTrailEventDetail[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
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
        updated_at,
        races (
          id,
          name,
          date,
          distance_km,
          elevation_gain_m,
          city,
          province,
          map_url,
          race_tiers ( id, ends_at, price_eur )
        )
      `,
      )
      .order('name');

    if (error || !data) {
      console.error('Failed to fetch events for admin:', error);
      return [];
    }

    const events = toEventDetails(data as EventWithRacesRow[]);
    const drafts = await getPendingDraftsByEventIds(
      events.map(({ event }) => event.id),
    );
    const draftsByEventId = new Map(
      drafts.map((draft) => [draft.eventId, draft]),
    );

    return events.map((eventDetail) => ({
      ...eventDetail,
      pendingDraft: draftsByEventId.get(eventDetail.event.id) ?? null,
    }));
  },
);

export async function getEventsForOrganizer(
  organizerId: string,
): Promise<TrailEventDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
      updated_at,
      races (
        id,
        name,
        date,
        distance_km,
        elevation_gain_m,
        city,
        province,
        map_url,
        race_tiers ( id, ends_at, price_eur )
      )
    `,
    )
    .eq('organizer_id', organizerId);

  if (error || !data) {
    if (error) {
      console.error('Failed to fetch organizer events:', error);
    }
    return [];
  }

  return (data as EventWithRacesRow[])
    .map((row) =>
      buildEventDetail(
        toTrailEvent(row),
        getEventRaceRows(row.races).map(toTrailEventRace),
      ),
    )
    .sort(
      (a, b) =>
        (a.dateRange.startDate ?? '').localeCompare(
          b.dateRange.startDate ?? '',
        ) || a.event.name.localeCompare(b.event.name),
    );
}

export async function getEventByIdForOrganizer(
  eventId: string,
  organizerId: string,
): Promise<TrailEventDetail | null> {
  const supabase = await createClient();

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
    .eq('organizer_id', organizerId)
    .single();

  if (eventError || !eventData) {
    if (eventError) {
      console.error('Failed to fetch organizer event by id:', eventError);
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
    console.error(
      'Failed to fetch organizer event races by event id:',
      raceError,
    );
    return null;
  }

  return buildEventDetail(
    event,
    (raceData as EventRaceRow[]).map(toTrailEventRace),
  );
}

export async function getEventsByIds(
  eventIds: string[],
): Promise<TrailEventDetail[]> {
  if (eventIds.length === 0) {
    return [];
  }

  const supabase = createStaticClient();

  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select(
      `
      id,
      name,
      slug
    `,
    )
    .in('id', eventIds);

  if (eventError || !eventData) {
    console.error('Failed to fetch favorite events:', eventError);
    return [];
  }

  const events = (eventData as EventRow[]).map(toTrailEvent);
  const fetchedEventIds = events.map((event) => event.id);

  if (fetchedEventIds.length === 0) {
    return [];
  }

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
      event_id
    `,
    )
    .in('event_id', fetchedEventIds);

  if (raceError || !raceData) {
    console.error('Failed to fetch favorite event races:', raceError);
    return [];
  }

  const racesByEventId = new Map<string, TrailEventRace[]>();

  for (const race of raceData as EventRaceWithEventIdRow[]) {
    const eventRaces = racesByEventId.get(race.event_id) ?? [];
    eventRaces.push(toTrailEventRace(race));
    racesByEventId.set(race.event_id, eventRaces);
  }

  const eventOrder = new Map(
    eventIds.map((eventId, index) => [eventId, index]),
  );

  return events
    .map((event) => buildEventDetail(event, racesByEventId.get(event.id) ?? []))
    .sort(
      (a, b) =>
        (eventOrder.get(a.event.id) ?? Number.MAX_SAFE_INTEGER) -
        (eventOrder.get(b.event.id) ?? Number.MAX_SAFE_INTEGER),
    );
}

export async function getEventsByUrl(
  urls: string[],
): Promise<Array<{ id: string; name: string; websiteUrl: string }>> {
  if (urls.length === 0) {
    return [];
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('events')
    .select('id, name, website_url')
    .in('website_url', urls);

  if (error) {
    console.error('Failed to fetch event URL conflicts:', error);
    return [];
  }

  return (data ?? []).map(
    (row: { id: string; name: string; website_url: string | null }) => ({
      id: row.id,
      name: row.name,
      websiteUrl: row.website_url ?? '',
    }),
  );
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
      description
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
      race_tiers ( ends_at, price_eur )
    `,
    )
    .eq('event_id', event.id);

  if (raceError || !raceData) {
    console.error('Failed to fetch event races:', raceError);
    return null;
  }

  return buildEventDetail(
    event,
    (raceData as EventRaceRow[]).map(toTrailEventRace),
  );
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
      race_tiers ( id, ends_at, price_eur )
    `,
    )
    .eq('event_id', event.id);

  if (raceError || !raceData) {
    console.error('Failed to fetch event races by event id:', raceError);
    return null;
  }

  return buildEventDetail(
    event,
    (raceData as EventRaceRow[]).map(toTrailEventRace),
  );
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

export async function deleteEventForAdmin(eventId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('delete_event_with_races', {
    p_event_id: eventId,
  });

  if (error) {
    if (error.code === 'P0002') {
      throw new ValidationError('Event not found', 404);
    }

    console.error('Failed to delete event:', error);
    throw new Error('Failed to delete event');
  }
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
