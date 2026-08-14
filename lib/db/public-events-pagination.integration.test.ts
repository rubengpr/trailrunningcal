import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getUpcomingEventsPage } from '@/lib/db/events';

const LOCAL_PROJECT_REF = 'wghqldoshvwulyqqbqln';
const RUN_INTEGRATION_TESTS =
  process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const integrationDescribe = RUN_INTEGRATION_TESTS ? describe : describe.skip;

let admin: SupabaseClient;
let anonymous: SupabaseClient;
const eventIds: string[] = [];

function projectRefFromUrl(url: string): string {
  return new URL(url).hostname.split('.')[0] ?? '';
}

function rpcParameters(offset: number) {
  return {
    p_reference_date: '2030-01-01',
    p_offset: offset,
    p_months: [],
    p_provinces: [],
    p_distance_ranges: [],
    p_race_types: [],
    p_scope_province: 'Codex Automated Pagination',
    p_scope_race_type: null,
    p_include_locations: false,
  };
}

integrationDescribe('get_public_events_page integration', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !publishableKey || !serviceRoleKey) {
      throw new Error('Supabase integration test environment is missing');
    }
    if (projectRefFromUrl(url) !== LOCAL_PROJECT_REF) {
      throw new Error('Integration tests must target trailrunningcal-local');
    }

    admin = createClient(url, serviceRoleKey);
    anonymous = createClient(url, publishableKey);
  });

  afterEach(async () => {
    if (eventIds.length === 0) return;

    const ids = eventIds.splice(0);
    const { error: raceError } = await admin
      .from('races')
      .delete()
      .in('event_id', ids);
    const { error: eventError } = await admin
      .from('events')
      .delete()
      .in('id', ids);

    if (raceError || eventError) {
      throw raceError ?? eventError;
    }
  });

  it('returns stable 100-row pages to anonymous users', async () => {
    const runId = randomUUID();
    const eventRows = Array.from({ length: 105 }, (_, index) => ({
      name: `Pagination ${index.toString().padStart(3, '0')}`,
      slug: `pagination-${runId}-${index.toString().padStart(3, '0')}`,
    }));
    const { data: events, error: eventError } = await admin
      .from('events')
      .insert(eventRows)
      .select('id, name');

    if (eventError || !events) {
      throw eventError ?? new Error('Failed to insert pagination fixtures');
    }
    eventIds.push(...events.map((event) => event.id as string));

    const { error: raceError } = await admin.from('races').insert(
      events.map((event, index) => ({
        event_id: event.id,
        name: index === 1 ? 'Marcha fixture' : 'Trail fixture',
        date: '2031-10-01',
        distance_km: index === 0 ? 60 : 21,
        elevation_gain_m: 500,
        city: 'Test City',
        province: 'Codex Automated Pagination',
      })),
    );
    if (raceError) throw raceError;

    const [firstPage, secondPage, ultraPage, marchaPage] = await Promise.all([
      anonymous.rpc('get_public_events_page', rpcParameters(0)),
      anonymous.rpc('get_public_events_page', rpcParameters(100)),
      anonymous.rpc('get_public_events_page', {
        ...rpcParameters(0),
        p_distance_ranges: ['50+'],
      }),
      anonymous.rpc('get_public_events_page', {
        ...rpcParameters(0),
        p_scope_race_type: 'marcha',
      }),
    ]);

    for (const result of [firstPage, secondPage, ultraPage, marchaPage]) {
      if (result.error) throw result.error;
    }

    expect(firstPage.data).toHaveLength(100);
    expect(firstPage.data?.[0].total_count).toBe(105);
    expect(firstPage.data?.[0].name).toBe('Pagination 000');
    expect(firstPage.data?.[0].races?.[0]).not.toHaveProperty('latitude');
    expect(firstPage.data?.[0].races?.[0]).not.toHaveProperty('longitude');
    expect(firstPage.data?.[99].name).toBe('Pagination 099');
    expect(secondPage.data).toHaveLength(5);
    expect(secondPage.data?.[0].name).toBe('Pagination 100');
    expect(ultraPage.data).toHaveLength(1);
    expect(ultraPage.data?.[0].name).toBe('Pagination 000');
    expect(marchaPage.data).toHaveLength(1);
    expect(marchaPage.data?.[0].name).toBe('Pagination 001');

    const emptyPage = await getUpcomingEventsPage({
      page: 3,
      referenceDate: '2030-01-01',
      filters: {
        months: [],
        provinces: [],
        distanceRanges: [],
        raceTypes: [],
      },
      scope: { province: 'Codex Automated Pagination' },
    });

    expect(emptyPage.events).toHaveLength(0);
    expect(emptyPage.total).toBe(105);
    expect(emptyPage.hasMore).toBe(false);
  });

  it('classifies vertical kilometers from event names, race names, or profile', async () => {
    const runId = randomUUID();
    const { data: events, error: eventError } = await admin
      .from('events')
      .insert([
        { name: `VertiKalm ${runId}`, slug: `vertikalm-${runId}` },
        { name: `Race ${runId}`, slug: `race-${runId}` },
        { name: `Profile ${runId}`, slug: `profile-${runId}` },
        { name: `Trail ${runId}`, slug: `trail-${runId}` },
      ])
      .select('id, name');
    if (eventError || !events) {
      throw eventError ?? new Error('Failed to insert vertical kilometer fixtures');
    }
    eventIds.push(...events.map((event) => event.id as string));

    const eventByName = new Map(events.map((event) => [event.name, event.id]));
    const { error: raceError } = await admin.from('races').insert([
      {
        event_id: eventByName.get(`VertiKalm ${runId}`),
        name: 'Race fixture',
        date: '2031-10-01',
        distance_km: 5,
        elevation_gain_m: 200,
        city: 'Test City',
        province: 'Codex Automated Pagination',
      },
      {
        event_id: eventByName.get(`Race ${runId}`),
        name: 'KMV fixture',
        date: '2031-10-01',
        distance_km: 7.8,
        elevation_gain_m: 200,
        city: 'Test City',
        province: 'Codex Automated Pagination',
      },
      {
        event_id: eventByName.get(`Profile ${runId}`),
        name: 'Race fixture',
        date: '2031-10-01',
        distance_km: 8,
        elevation_gain_m: 800,
        city: 'Test City',
        province: 'Codex Automated Pagination',
      },
      {
        event_id: eventByName.get(`Trail ${runId}`),
        name: 'Race fixture',
        date: '2031-10-01',
        distance_km: 8,
        elevation_gain_m: 600,
        city: 'Test City',
        province: 'Codex Automated Pagination',
      },
    ]);
    if (raceError) throw raceError;

    const { data, error } = await anonymous.rpc('get_public_events_page', {
      ...rpcParameters(0),
      p_scope_race_type: 'km-vertical',
    });
    if (error) throw error;

    expect(data?.map((event: { name: string }) => event.name)).toEqual([
      `Profile ${runId}`,
      `Race ${runId}`,
      `VertiKalm ${runId}`,
    ]);
  });

  it('returns only requested public event locations to anonymous users', async () => {
    const { data: knownLocation, error: locationError } = await admin
      .from('city_locations')
      .select('city, province, latitude, longitude')
      .limit(1)
      .single();
    if (locationError || !knownLocation) {
      throw locationError ?? new Error('No location fixture available');
    }

    const { data, error } = await anonymous.rpc('get_public_event_locations', {
      p_locations: [
        { city: knownLocation.city, province: knownLocation.province },
        { city: knownLocation.city, province: knownLocation.province },
        { city: 'Missing fixture', province: 'Missing fixture' },
      ],
    });
    if (error) throw error;

    expect(data).toEqual([knownLocation]);
  });
});
