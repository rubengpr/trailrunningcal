import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const LOCAL_PROJECT_REF = 'wghqldoshvwulyqqbqln';
const integrationDescribe =
  process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

let admin: SupabaseClient;
let anonymous: SupabaseClient;
const batchIds: string[] = [];
const draftIds: string[] = [];

function projectRefFromUrl(url: string): string {
  return new URL(url).hostname.split('.')[0] ?? '';
}

async function createBatch(names = ['XIV Solana Trail']): Promise<{
  batchId: string;
  itemId: string;
}> {
  const { data, error } = await admin.rpc('create_event_research_batch', {
    p_event_names: names,
    p_model: 'gpt-5.6-terra',
    p_prompt_slug: 'event-research-v0',
    p_prompt_version: 'test-version',
    p_search_context_size: 'high',
    p_concurrency: 4,
  });
  if (error || !data?.[0]) throw error ?? new Error('Failed to create batch');
  const batchId = data[0].id as string;
  batchIds.push(batchId);
  const { data: item, error: itemError } = await admin
    .from('event_research_batch_items')
    .select('id')
    .eq('batch_id', batchId)
    .single();
  if (itemError || !item) throw itemError ?? new Error('Missing item');
  return { batchId, itemId: item.id as string };
}

integrationDescribe('event research batch integration', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !serviceKey || !publicKey) throw new Error('Missing Supabase environment');
    if (projectRefFromUrl(url) !== LOCAL_PROJECT_REF) {
      throw new Error('Event research integration tests can only run locally');
    }
    admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    anonymous = createClient(url, publicKey, { auth: { persistSession: false } });
  });

  afterEach(async () => {
    const drafts = draftIds.splice(0);
    const batches = batchIds.splice(0);
    if (drafts.length > 0) await admin.from('event_import_drafts').delete().in('id', drafts);
    if (batches.length > 0) await admin.from('event_research_batches').delete().in('id', batches);
  });

  it('deduplicates names and hides rows from anonymous clients', async () => {
    const { batchId } = await createBatch(['Trail Navajas', 'trail navajas']);
    const serviceRows = await admin
      .from('event_research_batch_items')
      .select('id')
      .eq('batch_id', batchId);
    const anonymousRows = await anonymous
      .from('event_research_batch_items')
      .select('id')
      .eq('batch_id', batchId);
    expect(serviceRows.data).toHaveLength(1);
    expect(anonymousRows.error).not.toBeNull();
  });

  it('atomically completes an item and creates its editable draft', async () => {
    const { itemId } = await createBatch();
    expect((await admin.rpc('start_event_research_item', { p_item_id: itemId })).data).toBe(true);
    const result = {
      event: { name: 'XIV Solana Trail', description: null, websiteUrl: 'https://example.com' },
      races: [{ name: null, date: '2026-01-01', city: 'Beneixama', province: 'Valencia', distanceKm: 15, elevationGainM: 600, tiers: [] }],
      errorMessage: null,
    };
    const completed = await admin.rpc('complete_event_research_item', {
      p_item_id: itemId,
      p_result: result,
      p_sources: ['https://example.com'],
      p_usage: { totalTokens: 10 },
      p_openai_response_id: 'response-1',
      p_braintrust_root_span_id: 'span-1',
      p_race_count: 1,
      p_draft_data: { event: result.event, races: result.races },
      p_source_url: result.event.websiteUrl,
    });
    expect(completed.error).toBeNull();
    const draftId = (completed.data as { draft_id: string }).draft_id;
    draftIds.push(draftId);
    const [item, draft] = await Promise.all([
      admin.from('event_research_batch_items').select('status, draft_id').eq('id', itemId).single(),
      admin.from('event_import_drafts').select('status, research_batch_item_id').eq('id', draftId).single(),
    ]);
    expect(item.data).toEqual({ status: 'completed', draft_id: draftId });
    expect(draft.data).toEqual({ status: 'draft', research_batch_item_id: itemId });
  });

  it('stores negative results without drafts and retries failed items once', async () => {
    const negative = await createBatch(['No es una carrera']);
    await admin.rpc('start_event_research_item', { p_item_id: negative.itemId });
    await admin.rpc('complete_event_research_item', {
      p_item_id: negative.itemId,
      p_result: { event: null, races: [], errorMessage: 'Fuera de alcance.' },
      p_sources: [],
      p_usage: {},
      p_openai_response_id: 'response-negative',
      p_braintrust_root_span_id: 'span-negative',
      p_race_count: 0,
      p_draft_data: null,
      p_source_url: null,
    });
    const negativeRow = await admin
      .from('event_research_batch_items')
      .select('status, draft_id')
      .eq('id', negative.itemId)
      .single();
    expect(negativeRow.data).toEqual({ status: 'completed', draft_id: null });

    const failed = await createBatch(['Forced failure']);
    await admin.rpc('start_event_research_item', { p_item_id: failed.itemId });
    await admin.rpc('fail_event_research_item', {
      p_item_id: failed.itemId,
      p_error: 'Research request failed',
      p_braintrust_root_span_id: 'span-failed',
    });
    const retries = await Promise.all([
      admin.rpc('retry_event_research_item', { p_item_id: failed.itemId }),
      admin.rpc('retry_event_research_item', { p_item_id: failed.itemId }),
    ]);
    expect(retries.filter(({ error }) => error === null)).toHaveLength(1);
    expect(retries.filter(({ error }) => error?.code === 'P0004')).toHaveLength(1);
  });
});
