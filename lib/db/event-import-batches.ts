import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type {
  EventImportBatch,
  EventImportBatchItem,
  EventImportItemRow,
  EventImportBatchStatus,
  EventImportRow,
  EventImportResult,
} from '@/types/events-import-api.types';

function toBatch(row: EventImportRow): EventImportBatch {
  return {
    id: row.id,
    status: row.status,
    model: row.model,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: EventImportItemRow): EventImportBatchItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    url: row.url,
    status: row.status,
    reviewStatus: row.review_status,
    acceptedEventId: row.accepted_event_id,
    reviewedAt: row.reviewed_at,
    raceCount: row.race_count,
    error: row.error,
    markdown: row.result?.markdown ?? null,
    rawModelOutput: row.result?.rawModelOutput ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEventImportBatch(input: {
  urls: string[];
  model: OpenRouterScrapeModelId;
}): Promise<EventImportBatch> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('create_event_import_batch', {
    p_urls: input.urls,
    p_model: input.model,
  });

  if (error || !data || data.length === 0) {
    console.error('Event import batch rpc error:', error);
    throw new Error('Failed to create event import batch');
  }

  return toBatch(data[0] as EventImportRow);
}

export async function setBatchWorkflowRunId(input: {
  batchId: string;
  workflowRunId: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_import_batches')
    .update({
      workflow_run_id: input.workflowRunId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.batchId);

  if (error) {
    console.error('Event import batch workflow run update error:', error);
    throw new Error('Failed to update event import batch workflow run');
  }
}

export async function getEventImportBatch(
  batchId: string,
): Promise<EventImportBatch | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_import_batches')
    .select('id, status, model, workflow_run_id, created_at, updated_at')
    .eq('id', batchId)
    .maybeSingle();

  if (error) {
    console.error('Event import batch fetch error:', error);
    throw new Error('Failed to fetch event import batch');
  }

  return data ? toBatch(data as EventImportRow) : null;
}

export async function getPendingBatchItems(
  batchId: string,
): Promise<EventImportBatchItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_import_batch_items')
    .select(
      'id, batch_id, url, status, review_status, accepted_event_id, reviewed_at, result, race_count, error, created_at, updated_at',
    )
    .eq('batch_id', batchId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Event import batch items fetch error:', error);
    throw new Error('Failed to fetch event import batch items');
  }

  return ((data ?? []) as EventImportItemRow[]).map(toItem);
}

export async function getBatchSnapshotData(
  batchId: string,
): Promise<{
  batch: EventImportBatch;
  items: EventImportBatchItem[];
} | null> {
  const [batch, items] = await Promise.all([
    getEventImportBatch(batchId),
    getBatchItems(batchId),
  ]);

  if (!batch) {
    return null;
  }

  return {
    batch,
    items,
  };
}

export async function getBatchItems(
  batchId: string,
): Promise<EventImportBatchItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_import_batch_items')
    .select(
      'id, batch_id, url, status, review_status, accepted_event_id, reviewed_at, result, race_count, error, created_at, updated_at',
    )
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Event import batch items fetch error:', error);
    throw new Error('Failed to fetch event import batch items');
  }

  return ((data ?? []) as EventImportItemRow[]).map(toItem);
}

export async function updateBatchStatus(
  batchId: string,
  status: EventImportBatchStatus,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_import_batches')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  if (error) {
    console.error('Event import batch status update error:', error);
    throw new Error('Failed to update event import batch status');
  }
}

export async function markBatchItemRunning(itemId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_import_batch_items')
    .update({
      status: 'running',
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event import item running update error:', error);
    throw new Error('Failed to update event import item');
  }
}

export async function markBatchItemCompleted(
  itemId: string,
  input: {
    result: EventImportResult | null;
    raceCount: number;
  },
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_import_batch_items')
    .update({
      status: 'completed',
      result: input.result,
      race_count: input.raceCount,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event import item completed update error:', error);
    throw new Error('Failed to complete event import item');
  }
}

export async function markBatchItemFailed(
  itemId: string,
  errorMessage: string,
  markdown?: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_import_batch_items')
    .update({
      status: 'failed',
      error: errorMessage,
      result: markdown ? ({ markdown } as EventImportResult) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event import item failed update error:', error);
    throw new Error('Failed to fail event import item');
  }
}

export async function getItemResult(
  itemId: string,
): Promise<EventImportResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_import_batch_items')
    .select('result')
    .eq('id', itemId)
    .eq('status', 'completed')
    .maybeSingle();

  if (error) {
    console.error('Event import item result fetch error:', error);
    throw new Error('Failed to fetch event import item result');
  }

  return (data?.result as EventImportResult | null) ?? null;
}

export async function getItemResultState(itemId: string): Promise<{
  result: EventImportResult;
  reviewStatus: EventImportItemRow['review_status'];
} | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_import_batch_items')
    .select('result, review_status')
    .eq('id', itemId)
    .eq('status', 'completed')
    .maybeSingle();

  if (error) {
    console.error('Event import item result state fetch error:', error);
    throw new Error('Failed to fetch event import item result');
  }

  if (!data?.result) {
    return null;
  }

  return {
    result: data.result as EventImportResult,
    reviewStatus: data.review_status as EventImportItemRow['review_status'],
  };
}

export async function saveItemResult(
  itemId: string,
  result: EventImportResult,
): Promise<EventImportResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_import_batch_items')
    .update({
      result,
      race_count: result.races.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('status', 'completed')
    .eq('review_status', 'pending')
    .not('result', 'is', null)
    .select('result')
    .maybeSingle();

  if (error) {
    console.error('Event import item result update error:', error);
    throw new Error('Failed to update event import item result');
  }

  return (data?.result as EventImportResult | null) ?? null;
}

export async function acceptItem(itemId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('accept_event_import_item', {
    p_item_id: itemId,
  });

  if (error || !data) {
    if (error?.code === 'P0002') {
      throw new ValidationError('Item not found', 404);
    }

    if (error?.code === 'P0003') {
      throw new ValidationError('Accepted event not found', 409);
    }

    console.error('Event import item accept rpc error:', error);
    throw new Error('Failed to accept event import item');
  }

  return data as string;
}
