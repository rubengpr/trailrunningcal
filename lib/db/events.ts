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
  TrailEvent,
  TrailEventDetail,
  TrailEventRace,
  EventRaceTier,
  TrailEventDetailWithTracks,
  TrailEventRaceWithTrack,
} from '@/types/event.types';
import type {
  PublicEventPage,
  PublicEventPageRequest,
} from '@/types/public-events.types';
import type {
  AdminEventPage,
  AdminEventPageRequest,
} from '@/types/admin-events.types';
import { buildEventDetail, toPublicEventDetail } from '@/lib/events/utils';
import { getPendingDraftsByEventIds } from '@/lib/db/event-drafts';
import { PUBLIC_EVENTS_PAGE_SIZE } from '@/lib/db/public-events-pagination';
import { ADMIN_EVENTS_PAGE_SIZE } from '@/lib/events/admin-pagination';
import { toTrackGeometry } from '@/lib/race-tracks/routes';

type EventRaceTrackRow = EventRaceRow & { track_geometry: unknown };

type PublicEventPageRow = Pick<EventRow, 'id' | 'name' | 'slug'> & {
  start_date: string;
  end_date: string;
  total_count: number | string;
  races: EventRaceWithEventIdRow[];
};

interface AdminEventPageIndexRow {
  event_ids: string[];
  total_count: number | string;
}

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

export async function getUpcomingEventsPage({
  page,
  referenceDate,
  filters,
  scope,
}: PublicEventPageRequest): Promise<PublicEventPage> {
  const supabase = createStaticClient();

  const offset = (page - 1) * PUBLIC_EVENTS_PAGE_SIZE;
  const rpcInput = {
    p_reference_date: referenceDate,
    p_months: filters.months.map((month) => month + 1),
    p_provinces: filters.provinces,
    p_distance_ranges: filters.distanceRanges,
    p_race_types: filters.raceTypes,
    p_scope_province: scope?.province ?? null,
    p_scope_race_type: scope?.raceType ?? null,
    p_include_locations: false,
  };
  const { data, error } = await supabase.rpc('get_public_events_page', {
    ...rpcInput,
    p_offset: offset,
  });

  if (error) {
    console.error('Failed to fetch upcoming event page:', error);
    throw new Error('Failed to fetch upcoming event page');
  }

  const rows = (data ?? []) as PublicEventPageRow[];
  let total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  if (rows.length === 0 && offset > 0) {
    const { data: firstPageData, error: firstPageError } = await supabase.rpc(
      'get_public_events_page',
      { ...rpcInput, p_offset: 0 },
    );

    if (firstPageError) {
      console.error('Failed to fetch upcoming event total:', firstPageError);
      throw new Error('Failed to fetch upcoming event page');
    }

    const firstPageRows = (firstPageData ?? []) as PublicEventPageRow[];
    total = firstPageRows.length > 0
      ? Number(firstPageRows[0].total_count)
      : 0;
  }

  const events = rows.map((row) => {
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
  return {
    events,
    page,
    total,
    hasMore: events.length > 0 && offset + events.length < total,
    referenceDate,
  };
}

export async function getAdminEventsPage({
  page,
  search,
  sortColumn,
  sortDirection,
}: AdminEventPageRequest): Promise<AdminEventPage> {
  const supabase = createAdminClient();
  const offset = (page - 1) * ADMIN_EVENTS_PAGE_SIZE;

  const { data: indexData, error: indexError } = await supabase.rpc(
    'get_admin_events_page',
    {
      p_limit: ADMIN_EVENTS_PAGE_SIZE,
      p_offset: offset,
      p_search: search || null,
      p_sort_column: sortColumn,
      p_sort_direction: sortDirection,
    },
  );

  if (indexError || !indexData?.[0]) {
    console.error('Failed to fetch admin event page index:', indexError);
    throw new Error('Failed to fetch admin event page');
  }

  const indexRow = indexData[0] as AdminEventPageIndexRow;
  const eventIds = indexRow.event_ids;
  const total = Number(indexRow.total_count);

  if (!Number.isSafeInteger(total) || total < 0) {
    console.error('Invalid admin event total:', indexRow.total_count);
    throw new Error('Failed to fetch admin event page');
  }

  if (eventIds.length === 0) {
    return {
      events: [],
      page,
      pageSize: ADMIN_EVENTS_PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / ADMIN_EVENTS_PAGE_SIZE),
    };
  }

  const [eventResult, drafts] = await Promise.all([
    supabase
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
      .in('id', eventIds),
    getPendingDraftsByEventIds(eventIds),
  ]);

  if (eventResult.error || !eventResult.data) {
    console.error('Failed to fetch admin event page details:', eventResult.error);
    throw new Error('Failed to fetch admin event page');
  }

  const eventOrder = new Map(
    eventIds.map((eventId, index) => [eventId, index]),
  );
  const draftsByEventId = new Map(
    drafts.map((draft) => [draft.eventId, draft]),
  );
  const events = toEventDetails(eventResult.data as EventWithRacesRow[])
    .map<AdminTrailEventDetail>((eventDetail) => ({
      ...eventDetail,
      pendingDraft: draftsByEventId.get(eventDetail.event.id) ?? null,
    }))
    .sort(
      (a, b) =>
        (eventOrder.get(a.event.id) ?? Number.MAX_SAFE_INTEGER) -
        (eventOrder.get(b.event.id) ?? Number.MAX_SAFE_INTEGER),
    );

  return {
    events,
    page,
    pageSize: ADMIN_EVENTS_PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / ADMIN_EVENTS_PAGE_SIZE),
  };
}

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
): Promise<TrailEventDetailWithTracks | null> {
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
      track_geometry,
      race_tiers ( ends_at, price_eur )
    `,
    )
    .eq('event_id', event.id);

  if (raceError || !raceData) {
    console.error('Failed to fetch event races:', raceError);
    return null;
  }

  const races = (raceData as EventRaceTrackRow[]).map<TrailEventRaceWithTrack>(
    (row) => ({
      ...toTrailEventRace(row),
      trackGeometry: toTrackGeometry(row.track_geometry),
    }),
  );
  const detail = buildEventDetail(event, races);
  const racesById = new Map(races.map((race) => [race.id, race]));

  return {
    ...detail,
    races: detail.races.flatMap((race) => {
      const raceWithTrack = racesById.get(race.id);
      return raceWithTrack ? [raceWithTrack] : [];
    }),
  };
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
