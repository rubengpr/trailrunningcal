import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

function rpcParameters(search: string, offset: number) {
  return {
    p_limit: 50,
    p_offset: offset,
    p_search: search,
    p_sort_column: 'name',
    p_sort_direction: 'asc',
  };
}

integrationDescribe('get_admin_events_page integration', () => {
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

  it('returns secure, stable 50-row pages with global search and sorting', async () => {
    const runId = randomUUID();
    const search = `admin-page-${runId}`;
    const eventRows = Array.from({ length: 55 }, (_, index) => ({
      name: `Admin Pagination ${index.toString().padStart(3, '0')}`,
      slug: `${search}-${index.toString().padStart(3, '0')}`,
      website_url: `https://example.com/${search}/${index}`,
    }));
    const { data: events, error: eventError } = await admin
      .from('events')
      .insert(eventRows)
      .select('id, name');

    if (eventError || !events) {
      throw eventError ?? new Error('Failed to insert admin pagination fixtures');
    }
    eventIds.push(...events.map((event) => event.id as string));

    const { error: raceError } = await admin.from('races').insert(
      events.slice(1).map((event, index) => ({
        event_id: event.id,
        name: 'Admin pagination race',
        date: `2031-10-${((index % 28) + 1).toString().padStart(2, '0')}`,
        distance_km: 21,
        elevation_gain_m: 500,
        city: 'Test City',
        province: 'Barcelona',
      })),
    );
    if (raceError) throw raceError;

    const [firstPage, secondPage, datePage, anonymousPage] = await Promise.all([
      admin.rpc('get_admin_events_page', rpcParameters(search, 0)),
      admin.rpc('get_admin_events_page', rpcParameters(search, 50)),
      admin.rpc('get_admin_events_page', {
        ...rpcParameters(search, 0),
        p_sort_column: 'dates',
      }),
      anonymous.rpc('get_admin_events_page', rpcParameters(search, 0)),
    ]);

    for (const result of [firstPage, secondPage, datePage]) {
      if (result.error) throw result.error;
    }

    expect(firstPage.data).toEqual([
      expect.objectContaining({ total_count: 55 }),
    ]);
    expect(firstPage.data?.[0].event_ids).toHaveLength(50);
    expect(secondPage.data?.[0].event_ids).toHaveLength(5);
    expect(
      firstPage.data?.[0].event_ids.filter((id: string) =>
        secondPage.data?.[0].event_ids.includes(id),
      ),
    ).toEqual([]);
    expect(datePage.data?.[0].event_ids[0]).toBe(events[0].id);
    expect(anonymousPage.error).not.toBeNull();
  });
});
