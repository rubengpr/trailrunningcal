import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createEventUpdateBatch } from './event-update-batches';

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

async function createEventFixture(label: string): Promise<string> {
  const suffix = randomUUID();
  const { data, error } = await supabase
    .from('events')
    .insert({
      name: `${label} ${suffix}`,
      slug: `event-update-batch-test-${suffix}`,
      website_url: 'https://example.com/original',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create event fixture');
  }

  eventIds.push(data.id as string);
  return data.id as string;
}

async function createRaceFixture(input: {
  eventId: string;
  date: string | null;
  distanceKm?: number;
}): Promise<string> {
  const suffix = randomUUID();
  const { data, error } = await supabase
    .from('races')
    .insert({
      event_id: input.eventId,
      name: `Update candidate race ${suffix}`,
      date: input.date,
      distance_km: input.distanceKm ?? 21,
      elevation_gain_m: 1000,
      city: 'Barcelona',
      province: 'Barcelona',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create race fixture');
  }

  return data.id as string;
}

async function createDraftFixture(eventId: string): Promise<string> {
  const { data, error } = await supabase
    .from('event_drafts')
    .insert({
      event_id: eventId,
      data: {
        event: {
          name: 'Pending update draft',
          websiteUrl: 'https://example.com/draft',
          description: 'Draft description',
        },
        races: [
          {
            name: 'Pending draft race',
            date: '1900-01-01',
            city: 'Barcelona',
            province: 'Barcelona',
            distanceKm: 21,
            elevationGainM: 1000,
          },
        ],
      },
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create draft fixture');
  }

  return data.id as string;
}

async function createBatchFixture(
  workflowRunId: string | null = null,
): Promise<string> {
  const { data, error } = await supabase
    .from('event_update_batches')
    .insert({ workflow_run_id: workflowRunId })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create update batch fixture');
  }

  batchIds.push(data.id as string);
  return data.id as string;
}

async function createItemFixture(input: {
  batchId: string;
  eventId: string;
  sourceUrl?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  targetYear?: number;
}): Promise<string> {
  const { data, error } = await supabase
    .from('event_update_batch_items')
    .insert({
      batch_id: input.batchId,
      event_id: input.eventId,
      target_year: input.targetYear ?? 2027,
      source_url: input.sourceUrl ?? 'https://example.com/original',
      ...(input.status ? { status: input.status } : {}),
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create update batch item fixture');
  }

  return data.id as string;
}

integrationDescribe('event update persistence integration', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error('Supabase integration test environment is missing');
    }

    if (projectRefFromUrl(url) !== LOCAL_PROJECT_REF) {
      throw new Error('Event update integration tests can only run locally');
    }

    supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterEach(async () => {
    const batchesToDelete = batchIds.splice(0);
    if (batchesToDelete.length > 0) {
      const { error } = await supabase
        .from('event_update_batches')
        .delete()
        .in('id', batchesToDelete);

      if (error) throw error;
    }

    const eventsToDelete = eventIds.splice(0);
    if (eventsToDelete.length > 0) {
      const { error } = await supabase
        .from('events')
        .delete()
        .in('id', eventsToDelete);

      if (error) throw error;
    }
  });

  it('persists defaults, URL snapshots, and terminal attempt history', async () => {
    const eventId = await createEventFixture('Defaults');
    const firstBatchId = await createBatchFixture();
    const firstItemId = await createItemFixture({
      batchId: firstBatchId,
      eventId,
    });

    const [batchResult, itemResult] = await Promise.all([
      supabase
        .from('event_update_batches')
        .select('status, workflow_run_id, created_at, updated_at')
        .eq('id', firstBatchId)
        .single(),
      supabase
        .from('event_update_batch_items')
        .select(
          'status, error, source_url, target_year, created_at, updated_at',
        )
        .eq('id', firstItemId)
        .single(),
    ]);

    expect(batchResult.error).toBeNull();
    expect(batchResult.data).toMatchObject({
      status: 'pending',
      workflow_run_id: null,
    });
    expect(batchResult.data?.created_at).toBeTruthy();
    expect(batchResult.data?.updated_at).toBeTruthy();

    expect(itemResult.error).toBeNull();
    expect(itemResult.data).toMatchObject({
      status: 'pending',
      error: null,
      source_url: 'https://example.com/original',
      target_year: 2027,
    });
    expect(itemResult.data?.created_at).toBeTruthy();
    expect(itemResult.data?.updated_at).toBeTruthy();

    const { error: completeError } = await supabase
      .from('event_update_batch_items')
      .update({ status: 'completed' })
      .eq('id', firstItemId);
    expect(completeError).toBeNull();

    const secondBatchId = await createBatchFixture();
    const secondItemId = await createItemFixture({
      batchId: secondBatchId,
      eventId,
      sourceUrl: 'https://example.com/corrected',
      status: 'failed',
    });

    const { data: attempts, error: attemptsError } = await supabase
      .from('event_update_batch_items')
      .select('id, status, source_url')
      .eq('event_id', eventId)
      .eq('target_year', 2027)
      .in('status', ['completed', 'failed'])
      .order('created_at');

    expect(attemptsError).toBeNull();
    expect(attempts).toEqual([
      {
        id: firstItemId,
        status: 'completed',
        source_url: 'https://example.com/original',
      },
      {
        id: secondItemId,
        status: 'failed',
        source_url: 'https://example.com/corrected',
      },
    ]);
  });

  it('enforces statuses, foreign keys, and unique workflow run IDs', async () => {
    const eventId = await createEventFixture('Constraints');
    const batchId = await createBatchFixture(`run-${randomUUID()}`);

    const { error: batchStatusError } = await supabase
      .from('event_update_batches')
      .insert({ status: 'invalid' });
    expect(batchStatusError?.code).toBe('23514');

    const { error: itemStatusError } = await supabase
      .from('event_update_batch_items')
      .insert({
        batch_id: batchId,
        event_id: eventId,
        target_year: 2027,
        source_url: 'https://example.com',
        status: 'invalid',
      });
    expect(itemStatusError?.code).toBe('23514');

    const { error: missingBatchError } = await supabase
      .from('event_update_batch_items')
      .insert({
        batch_id: randomUUID(),
        event_id: eventId,
        target_year: 2027,
        source_url: 'https://example.com',
      });
    expect(missingBatchError?.code).toBe('23503');

    const { error: missingEventError } = await supabase
      .from('event_update_batch_items')
      .insert({
        batch_id: batchId,
        event_id: randomUUID(),
        target_year: 2027,
        source_url: 'https://example.com',
      });
    expect(missingEventError?.code).toBe('23503');

    const workflowRunId = `duplicate-run-${randomUUID()}`;
    await createBatchFixture(workflowRunId);
    const { error: duplicateRunError } = await supabase
      .from('event_update_batches')
      .insert({ workflow_run_id: workflowRunId });
    expect(duplicateRunError?.code).toBe('23505');
  });

  it('prevents duplicate events within one batch', async () => {
    const eventId = await createEventFixture('Batch duplicate');
    const batchId = await createBatchFixture();
    await createItemFixture({ batchId, eventId, status: 'completed' });

    const { error } = await supabase.from('event_update_batch_items').insert({
      batch_id: batchId,
      event_id: eventId,
      target_year: 2028,
      source_url: 'https://example.com/another-edition',
      status: 'completed',
    });

    expect(error?.code).toBe('23505');
  });

  it('allows one active item per event and target year', async () => {
    const eventId = await createEventFixture('Active item');
    const firstBatchId = await createBatchFixture();
    const firstItemId = await createItemFixture({
      batchId: firstBatchId,
      eventId,
    });

    const secondBatchId = await createBatchFixture();
    const duplicateActive = {
      batch_id: secondBatchId,
      event_id: eventId,
      target_year: 2027,
      source_url: 'https://example.com/second',
    };

    const { error: activeError } = await supabase
      .from('event_update_batch_items')
      .insert(duplicateActive);
    expect(activeError?.code).toBe('23505');

    const { error: completeError } = await supabase
      .from('event_update_batch_items')
      .update({ status: 'completed' })
      .eq('id', firstItemId);
    expect(completeError).toBeNull();

    const secondItemId = await createItemFixture({
      batchId: secondBatchId,
      eventId,
      status: 'failed',
    });

    const thirdBatchId = await createBatchFixture();
    const thirdItemId = await createItemFixture({
      batchId: thirdBatchId,
      eventId,
    });

    expect(secondItemId).toBeTruthy();
    expect(thirdItemId).toBeTruthy();
  });

  it('cascades item deletion from batches and events', async () => {
    const batchCascadeEventId = await createEventFixture('Batch cascade');
    const batchCascadeId = await createBatchFixture();
    const batchCascadeItemId = await createItemFixture({
      batchId: batchCascadeId,
      eventId: batchCascadeEventId,
    });

    const { error: batchDeleteError } = await supabase
      .from('event_update_batches')
      .delete()
      .eq('id', batchCascadeId);
    expect(batchDeleteError).toBeNull();

    const { data: deletedByBatch } = await supabase
      .from('event_update_batch_items')
      .select('id')
      .eq('id', batchCascadeItemId)
      .maybeSingle();
    expect(deletedByBatch).toBeNull();

    const eventCascadeEventId = await createEventFixture('Event cascade');
    const eventCascadeId = await createBatchFixture();
    const eventCascadeItemId = await createItemFixture({
      batchId: eventCascadeId,
      eventId: eventCascadeEventId,
    });

    const { error: eventDeleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventCascadeEventId);
    expect(eventDeleteError).toBeNull();

    const { data: deletedByEvent } = await supabase
      .from('event_update_batch_items')
      .select('id')
      .eq('id', eventCascadeItemId)
      .maybeSingle();
    expect(deletedByEvent).toBeNull();
  });

  it('creates an update batch from eligible event candidates', async () => {
    const eventId = await createEventFixture('Eligible candidate');
    await createRaceFixture({ eventId, date: '1899-01-01' });

    const batch = await createEventUpdateBatch({ referenceDate: '1899-07-01' });
    expect(batch).toMatchObject({
      status: 'pending',
      workflowRunId: null,
    });
    expect(batch?.createdAt).toBeTruthy();
    expect(batch?.updatedAt).toBeTruthy();

    batchIds.push(batch!.id);

    const { data: items, error } = await supabase
      .from('event_update_batch_items')
      .select('event_id, target_year, source_url, status')
      .eq('batch_id', batch!.id);

    expect(error).toBeNull();
    expect(items).toEqual([
      {
        event_id: eventId,
        target_year: 1900,
        source_url: 'https://example.com/original',
        status: 'pending',
      },
    ]);
  });

  it('does not create a batch when there are no candidates', async () => {
    const eventId = await createEventFixture('Too recent');
    await createRaceFixture({ eventId, date: '1899-02-01' });

    const batch = await createEventUpdateBatch({ referenceDate: '1899-07-01' });

    expect(batch).toBeNull();
  });

  it('uses the latest race date to derive target year and eligibility', async () => {
    const eventId = await createEventFixture('Latest race');
    await createRaceFixture({ eventId, date: '1898-01-01' });
    await createRaceFixture({ eventId, date: '1899-01-15' });

    const batch = await createEventUpdateBatch({ referenceDate: '1899-07-15' });
    expect(batch).not.toBeNull();
    batchIds.push(batch!.id);

    const { data: item, error } = await supabase
      .from('event_update_batch_items')
      .select('target_year')
      .eq('batch_id', batch!.id)
      .eq('event_id', eventId)
      .single();

    expect(error).toBeNull();
    expect(item).toEqual({ target_year: 1900 });
  });

  it('excludes events without source URLs or with pending drafts', async () => {
    const missingUrlEventId = await createEventFixture('Missing URL');
    await supabase
      .from('events')
      .update({ website_url: null })
      .eq('id', missingUrlEventId);
    await createRaceFixture({ eventId: missingUrlEventId, date: '1899-01-01' });

    const draftedEventId = await createEventFixture('Pending draft');
    await createRaceFixture({ eventId: draftedEventId, date: '1899-01-01' });
    await createDraftFixture(draftedEventId);

    const batch = await createEventUpdateBatch({ referenceDate: '1899-07-01' });

    expect(batch).toBeNull();
  });

  it('blocks candidates with active attempts for the same event and target year', async () => {
    const eventId = await createEventFixture('Active attempt candidate');
    await createRaceFixture({ eventId, date: '1899-01-01' });
    const activeBatchId = await createBatchFixture();
    await createItemFixture({
      batchId: activeBatchId,
      eventId,
      targetYear: 1900,
      status: 'running',
    });

    const batch = await createEventUpdateBatch({ referenceDate: '1899-07-01' });

    expect(batch).toBeNull();
  });

  it('allows the sixth consumed attempt and blocks the seventh', async () => {
    const eventId = await createEventFixture('Attempt limit');
    await createRaceFixture({ eventId, date: '1899-01-01' });

    for (let index = 0; index < 5; index += 1) {
      const previousBatchId = await createBatchFixture();
      await createItemFixture({
        batchId: previousBatchId,
        eventId,
        targetYear: 1900,
        status: index % 2 === 0 ? 'completed' : 'failed',
      });
    }

    const sixthBatch = await createEventUpdateBatch({
      referenceDate: '1899-07-01',
    });
    expect(sixthBatch).not.toBeNull();
    batchIds.push(sixthBatch!.id);

    const { error: completeError } = await supabase
      .from('event_update_batch_items')
      .update({ status: 'completed' })
      .eq('batch_id', sixthBatch!.id);
    expect(completeError).toBeNull();

    const seventhBatch = await createEventUpdateBatch({
      referenceDate: '1899-07-01',
    });
    expect(seventhBatch).toBeNull();
  });

  it('keeps different URL snapshots across attempts', async () => {
    const eventId = await createEventFixture('URL snapshots');
    await createRaceFixture({ eventId, date: '1899-01-01' });

    const firstBatch = await createEventUpdateBatch({
      referenceDate: '1899-07-01',
    });
    expect(firstBatch).not.toBeNull();
    batchIds.push(firstBatch!.id);

    const { error: completeError } = await supabase
      .from('event_update_batch_items')
      .update({ status: 'failed' })
      .eq('batch_id', firstBatch!.id);
    expect(completeError).toBeNull();

    const { error: updateEventError } = await supabase
      .from('events')
      .update({ website_url: 'https://example.com/changed' })
      .eq('id', eventId);
    expect(updateEventError).toBeNull();

    const secondBatch = await createEventUpdateBatch({
      referenceDate: '1899-07-01',
    });
    expect(secondBatch).not.toBeNull();
    batchIds.push(secondBatch!.id);

    const { data: sources, error } = await supabase
      .from('event_update_batch_items')
      .select('source_url')
      .eq('event_id', eventId)
      .eq('target_year', 1900)
      .order('created_at');

    expect(error).toBeNull();
    expect(sources).toEqual([
      { source_url: 'https://example.com/original' },
      { source_url: 'https://example.com/changed' },
    ]);
  });

  it('serializes concurrent batch creation for the same candidate', async () => {
    const eventId = await createEventFixture('Concurrent candidate');
    await createRaceFixture({ eventId, date: '1899-01-01' });

    const results = await Promise.all([
      createEventUpdateBatch({ referenceDate: '1899-07-01' }),
      createEventUpdateBatch({ referenceDate: '1899-07-01' }),
    ]);

    const createdBatches = results.filter((batch) => batch !== null);
    expect(createdBatches).toHaveLength(1);
    batchIds.push(createdBatches[0]!.id);

    const { data: items, error } = await supabase
      .from('event_update_batch_items')
      .select('id')
      .eq('event_id', eventId)
      .eq('target_year', 1900);

    expect(error).toBeNull();
    expect(items).toHaveLength(1);
  });
});
