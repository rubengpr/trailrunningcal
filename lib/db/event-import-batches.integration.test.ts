import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EventImportResult } from '@/types/events-import-api.types';

const LOCAL_PROJECT_REF = 'wghqldoshvwulyqqbqln';
const RUN_INTEGRATION_TESTS =
  process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const integrationDescribe = RUN_INTEGRATION_TESTS ? describe : describe.skip;

let supabase: SupabaseClient;
const batchIds: string[] = [];
const eventIds: string[] = [];

function projectRefFromUrl(url: string): string {
  return new URL(url).hostname.split('.')[0] ?? '';
}

function resultFixture(suffix: string): EventImportResult {
  return {
    workflow: 'crawlSiteExtract',
    url: `https://example.com/${suffix}`,
    event: {
      name: `Bulk acceptance ${suffix}`,
      description: 'Persisted reviewed description',
      websiteUrl: `https://example.com/${suffix}`,
    },
    races: [
      {
        name: 'Integration 21K',
        date: '2027-05-01',
        city: 'Girona',
        province: 'Girona',
        distanceKm: 21,
        elevationGainM: 900,
        tiers: [
          { priceEur: 25, endsAt: '2027-03-01' },
          { priceEur: 35, endsAt: '2027-04-01' },
        ],
      },
    ],
    errorMessage: null,
    markdown: '# Integration result',
    rawModelOutput: '{}',
    usage: null,
    pageStats: null,
    scrapeUsage: null,
    fallbackUsed: false,
    steps: [],
  };
}

async function createCompletedItem(result: EventImportResult): Promise<string> {
  const { data: batches, error: batchError } = await supabase.rpc(
    'create_event_import_batch',
    {
      p_urls: [result.url],
      p_model: 'openai/gpt-5.4-mini',
    },
  );

  if (batchError || !batches?.[0]) {
    throw batchError ?? new Error('Failed to create import batch fixture');
  }

  const batchId = batches[0].id as string;
  batchIds.push(batchId);

  const { data: item, error: itemError } = await supabase
    .from('event_import_batch_items')
    .update({ status: 'completed', result, race_count: result.races.length })
    .eq('batch_id', batchId)
    .select('id')
    .single();

  if (itemError || !item) {
    throw itemError ?? new Error('Failed to complete import item fixture');
  }

  return item.id as string;
}

integrationDescribe('accept_event_import_item integration', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error('Supabase integration test environment is missing');
    }

    if (projectRefFromUrl(url) !== LOCAL_PROJECT_REF) {
      throw new Error('Event import integration tests can only run locally');
    }

    supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterEach(async () => {
    const batchesToDelete = batchIds.splice(0);
    const eventsToDelete = eventIds.splice(0);

    if (batchesToDelete.length > 0) {
      const { error } = await supabase
        .from('event_import_batches')
        .delete()
        .in('id', batchesToDelete);
      if (error) throw error;
    }

    if (eventsToDelete.length > 0) {
      const { error } = await supabase
        .from('events')
        .delete()
        .in('id', eventsToDelete);
      if (error) throw error;
    }
  });

  it('defaults new items to pending review', async () => {
    const itemId = await createCompletedItem(resultFixture(randomUUID()));
    const { data, error } = await supabase
      .from('event_import_batch_items')
      .select('review_status, accepted_event_id, reviewed_at')
      .eq('id', itemId)
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({
      review_status: 'pending',
      accepted_event_id: null,
      reviewed_at: null,
    });
  });

  it('atomically creates one event with races and tiers and is safe to retry concurrently', async () => {
    const itemId = await createCompletedItem(resultFixture(randomUUID()));
    const attempts = await Promise.all([
      supabase.rpc('accept_event_import_item', { p_item_id: itemId }),
      supabase.rpc('accept_event_import_item', { p_item_id: itemId }),
    ]);

    expect(attempts.every(({ error }) => error === null)).toBe(true);
    const acceptedEventId = attempts[0].data as string;
    eventIds.push(acceptedEventId);
    expect(attempts[1].data).toBe(acceptedEventId);

    const [itemResult, eventResult, racesResult] = await Promise.all([
      supabase
        .from('event_import_batch_items')
        .select('review_status, accepted_event_id, reviewed_at')
        .eq('id', itemId)
        .single(),
      supabase
        .from('events')
        .select('name, description, website_url')
        .eq('id', acceptedEventId)
        .single(),
      supabase
        .from('races')
        .select('name, distance_km, elevation_gain_m, race_tiers(price_eur, ends_at)')
        .eq('event_id', acceptedEventId),
    ]);

    expect(itemResult.error).toBeNull();
    expect(itemResult.data).toMatchObject({
      review_status: 'accepted',
      accepted_event_id: acceptedEventId,
    });
    expect(itemResult.data?.reviewed_at).not.toBeNull();
    expect(eventResult.data?.description).toBe('Persisted reviewed description');
    expect(racesResult.data).toEqual([
      {
        name: 'Integration 21K',
        distance_km: 21,
        elevation_gain_m: 900,
        race_tiers: [
          { price_eur: 25, ends_at: '2027-03-01' },
          { price_eur: 35, ends_at: '2027-04-01' },
        ],
      },
    ]);
  });

  it('rolls back creation when stored race data is invalid', async () => {
    const suffix = randomUUID();
    const result = resultFixture(suffix);
    result.races[0].date = 'not-a-date';
    const itemId = await createCompletedItem(result);

    const { error: acceptError } = await supabase.rpc(
      'accept_event_import_item',
      { p_item_id: itemId },
    );
    expect(acceptError).not.toBeNull();

    const [itemResult, eventResult] = await Promise.all([
      supabase
        .from('event_import_batch_items')
        .select('review_status, accepted_event_id, reviewed_at')
        .eq('id', itemId)
        .single(),
      supabase.from('events').select('id').eq('name', result.event?.name),
    ]);

    expect(itemResult.data).toEqual({
      review_status: 'pending',
      accepted_event_id: null,
      reviewed_at: null,
    });
    expect(eventResult.data).toEqual([]);
  });

  it('retains accepted history and clears the link when its event is deleted', async () => {
    const itemId = await createCompletedItem(resultFixture(randomUUID()));
    const { data: eventId, error: acceptError } = await supabase.rpc(
      'accept_event_import_item',
      { p_item_id: itemId },
    );
    expect(acceptError).toBeNull();

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);
    expect(deleteError).toBeNull();

    const { data: item, error: itemError } = await supabase
      .from('event_import_batch_items')
      .select('review_status, accepted_event_id, reviewed_at')
      .eq('id', itemId)
      .single();
    expect(itemError).toBeNull();
    expect(item).toMatchObject({
      review_status: 'accepted',
      accepted_event_id: null,
    });
    expect(item?.reviewed_at).not.toBeNull();

    const retry = await supabase.rpc('accept_event_import_item', {
      p_item_id: itemId,
    });
    expect(retry.error?.code).toBe('P0003');
  });
});
