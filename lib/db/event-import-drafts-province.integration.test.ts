import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const LOCAL_PROJECT_REF = 'wghqldoshvwulyqqbqln';
const integrationDescribe = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true'
  ? describe
  : describe.skip;

let admin: SupabaseClient;
let anonymous: SupabaseClient;
const draftIds: string[] = [];

integrationDescribe('get_event_import_drafts_page province filtering', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || !serviceKey) {
      throw new Error('Supabase integration test environment is missing');
    }
    if (new URL(url).hostname.split('.')[0] !== LOCAL_PROJECT_REF) {
      throw new Error('Integration tests must target trailrunningcal-local');
    }

    admin = createClient(url, serviceKey);
    anonymous = createClient(url, key);
  });

  afterEach(async () => {
    if (draftIds.length === 0) return;
    const { error } = await admin.from('event_import_drafts')
      .delete().in('id', draftIds.splice(0));
    if (error) throw error;
  });

  it('filters before pagination and counts events once across all their races', async () => {
    const search = `draft-province-${randomUUID()}`;
    const race = (province: string) => ({
      name: 'Trail', date: '2031-05-01', city: 'Test City', province,
      distanceKm: 20, elevationGainM: 500, tiers: [],
    });
    const fixtures = [
      ...Array.from({ length: 51 }, (_, index) => ({
        status: 'draft',
        data: {
          event: { name: `${search}-${index.toString().padStart(2, '0')}` },
          races: index === 0
            ? [race('Barcelona'), race('Girona'), race('Barcelona')]
            : [race('Barcelona')],
        },
      })),
      { status: 'draft', data: { event: { name: `${search}-other` }, races: [race('Girona')] } },
      { status: 'draft', data: { event: { name: `${search}-madrid` }, races: [race('Madrid')] } },
      { status: 'rejected', data: { event: { name: `${search}-rejected` }, races: [race('Barcelona')] } },
    ];
    const { data: inserted, error } = await admin.from('event_import_drafts')
      .insert(fixtures).select('id, data');
    if (error || !inserted) throw error ?? new Error('Failed to insert draft fixtures');
    draftIds.push(...inserted.map((draft) => draft.id as string));

    const query = {
      p_limit: 50, p_offset: 0, p_search: search,
      p_sort_column: 'name', p_sort_direction: 'asc', p_province: 'Barcelona',
    };
    const { data: first, error: firstError } = await admin.rpc('get_event_import_drafts_page', query);
    if (firstError) throw firstError;
    expect(first[0].total_count).toBe(51);
    expect(first[0].draft_ids).toHaveLength(50);
    const expectedIds = inserted.slice(0, 51).map((draft) => draft.id);
    expect(first[0].draft_ids).toEqual(expectedIds.slice(0, 50));

    const { data: second, error: secondError } = await admin.rpc('get_event_import_drafts_page', {
      ...query, p_offset: 50,
    });
    if (secondError) throw secondError;
    expect(second[0].total_count).toBe(51);
    expect(second[0].draft_ids).toHaveLength(1);
    expect(second[0].draft_ids).toEqual(expectedIds.slice(50));
    expect(new Set([...first[0].draft_ids, ...second[0].draft_ids]).size).toBe(51);

    const { data: girona, error: gironaError } = await admin.rpc('get_event_import_drafts_page', {
      ...query, p_province: 'Girona',
    });
    if (gironaError) throw gironaError;
    expect(girona[0].total_count).toBe(2);

    const { data: unfiltered, error: unfilteredError } = await admin.rpc('get_event_import_drafts_page', {
      ...query, p_province: undefined,
    });
    if (unfilteredError) throw unfilteredError;
    expect(unfiltered[0].total_count).toBe(53);

    for (const [scope, province, total] of [
      [['Barcelona', 'Girona'], null, 52],
      [['Barcelona', 'Girona'], 'Girona', 2],
      [['Lugo', 'Ourense'], null, 0],
      [[], null, 0],
    ] as const) {
      const result = await admin.rpc('get_event_import_drafts_page', {
        ...query, p_province: province, p_provinces: [...scope],
      });
      if (result.error) throw result.error;
      expect(result.data[0].total_count).toBe(total);
      expect(new Set(result.data[0].draft_ids).size).toBe(result.data[0].draft_ids.length);
    }

    const otherId = inserted.find((draft) => draft.data.event.name === `${search}-other`)?.id;
    expect(otherId).toBeDefined();
    const { data: mismatch, error: mismatchError } = await admin.rpc('get_event_import_drafts_page', {
      ...query, p_draft_id: otherId,
    });
    if (mismatchError) throw mismatchError;
    expect(mismatch[0].total_count).toBe(0);
    expect(mismatch[0].draft_ids).toEqual([]);

    const { error: anonymousError } = await anonymous.rpc('get_event_import_drafts_page', query);
    expect(anonymousError?.code).toBe('42501');
  }, 30_000);
});
