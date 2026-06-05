import { createAdminClient } from '@/lib/supabase/server';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type {
  EventDescriptionBatch,
  EventDescriptionBatchItem,
  EventDescriptionBatchItemRow,
  EventDescriptionBatchRow,
  EventDescriptionBatchStatus,
  EventDescriptionDraftResult,
} from '@/types/event-description.types';

function toBatch(row: EventDescriptionBatchRow): EventDescriptionBatch {
  return {
    id: row.id,
    status: row.status,
    model: row.model,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: EventDescriptionBatchItemRow): EventDescriptionBatchItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    eventId: row.event_id,
    eventName: row.event_name,
    eventSlug: row.event_slug,
    status: row.status,
    error: row.error,
    description: row.result?.description ?? null,
    markdown: row.result?.markdown ?? null,
    rawModelOutput: row.result?.rawModelOutput ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEventDescriptionDraftResult(
  value: unknown,
): value is EventDescriptionDraftResult {
  return (
    isRecord(value) &&
    typeof value.eventId === 'string' &&
    typeof value.eventName === 'string' &&
    typeof value.eventSlug === 'string' &&
    typeof value.websiteUrl === 'string' &&
    typeof value.description === 'string' &&
    (typeof value.errorMessage === 'string' || value.errorMessage === null) &&
    (typeof value.markdown === 'string' || value.markdown === null) &&
    (typeof value.rawModelOutput === 'string' || value.rawModelOutput === null) &&
    (isRecord(value.usage) || value.usage === null) &&
    (isRecord(value.pageStats) || value.pageStats === null)
  );
}

export async function createEventDescriptionBatch(input: {
  eventIds: string[];
  model: OpenRouterScrapeModelId;
}): Promise<EventDescriptionBatch> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc(
    'create_event_description_batch',
    {
      p_event_ids: input.eventIds,
      p_model: input.model,
    },
  );

  if (error || !data || data.length === 0) {
    console.error('Event description batch rpc error:', error);
    throw new Error('Failed to create event description batch');
  }

  return toBatch(data[0] as EventDescriptionBatchRow);
}

export async function setEventDescriptionBatchWorkflowRunId(input: {
  batchId: string;
  workflowRunId: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_description_batches')
    .update({
      workflow_run_id: input.workflowRunId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.batchId);

  if (error) {
    console.error('Event description batch workflow run update error:', error);
    throw new Error('Failed to update event description batch workflow run');
  }
}

export async function getEventDescriptionBatch(
  batchId: string,
): Promise<EventDescriptionBatch | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_description_batches')
    .select('id, status, model, workflow_run_id, created_at, updated_at')
    .eq('id', batchId)
    .maybeSingle();

  if (error) {
    console.error('Event description batch fetch error:', error);
    throw new Error('Failed to fetch event description batch');
  }

  return data ? toBatch(data as EventDescriptionBatchRow) : null;
}

export async function getPendingEventDescriptionItems(
  batchId: string,
): Promise<EventDescriptionBatchItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_description_batch_items')
    .select(
      'id, batch_id, event_id, event_name, event_slug, status, result, error, created_at, updated_at',
    )
    .eq('batch_id', batchId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Event description batch items fetch error:', error);
    throw new Error('Failed to fetch event description batch items');
  }

  return ((data ?? []) as EventDescriptionBatchItemRow[]).map(toItem);
}

export async function getEventDescriptionBatchItems(
  batchId: string,
): Promise<EventDescriptionBatchItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_description_batch_items')
    .select(
      'id, batch_id, event_id, event_name, event_slug, status, result, error, created_at, updated_at',
    )
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Event description batch items fetch error:', error);
    throw new Error('Failed to fetch event description batch items');
  }

  return ((data ?? []) as EventDescriptionBatchItemRow[]).map(toItem);
}

export async function getEventDescriptionBatchSnapshotData(
  batchId: string,
): Promise<{
  batch: EventDescriptionBatch;
  items: EventDescriptionBatchItem[];
} | null> {
  const [batch, items] = await Promise.all([
    getEventDescriptionBatch(batchId),
    getEventDescriptionBatchItems(batchId),
  ]);

  if (!batch) {
    return null;
  }

  return {
    batch,
    items,
  };
}

export async function updateEventDescriptionBatchStatus(
  batchId: string,
  status: EventDescriptionBatchStatus,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_description_batches')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  if (error) {
    console.error('Event description batch status update error:', error);
    throw new Error('Failed to update event description batch status');
  }
}

export async function markEventDescriptionItemRunning(
  itemId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_description_batch_items')
    .update({
      status: 'running',
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event description item running update error:', error);
    throw new Error('Failed to update event description item');
  }
}

export async function markEventDescriptionItemCompleted(
  itemId: string,
  result: EventDescriptionDraftResult,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_description_batch_items')
    .update({
      status: 'completed',
      result,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event description item completed update error:', error);
    throw new Error('Failed to complete event description item');
  }
}

export async function markEventDescriptionItemFailed(
  itemId: string,
  errorMessage: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_description_batch_items')
    .update({
      status: 'failed',
      error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event description item failed update error:', error);
    throw new Error('Failed to fail event description item');
  }
}

export async function getEventDescriptionItemResult(
  itemId: string,
): Promise<EventDescriptionDraftResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_description_batch_items')
    .select('result')
    .eq('id', itemId)
    .eq('status', 'completed')
    .maybeSingle();

  if (error) {
    console.error('Event description item result fetch error:', error);
    throw new Error('Failed to fetch event description item result');
  }

  if (!data?.result) {
    return null;
  }

  if (!isEventDescriptionDraftResult(data.result)) {
    console.error('Invalid event description item result:', {
      itemId,
      result: data.result,
    });
    throw new Error('Invalid event description item result');
  }

  return data.result;
}
