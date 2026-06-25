import { createAdminClient } from '@/lib/supabase/server';
import type {
  EventUpdateBatch,
  EventUpdateBatchItem,
  EventUpdateBatchItemRow,
  EventUpdateBatchRow,
  EventUpdateBatchStatus,
} from '@/types/event-update.types';

function toBatch(row: EventUpdateBatchRow): EventUpdateBatch {
  return {
    id: row.id,
    status: row.status,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: EventUpdateBatchItemRow): EventUpdateBatchItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    eventId: row.event_id,
    targetYear: row.target_year,
    sourceUrl: row.source_url,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEventUpdateBatch(input: {
  referenceDate: string;
}): Promise<EventUpdateBatch | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('create_event_update_batch', {
    p_reference_date: input.referenceDate,
  });

  if (error) {
    console.error('Event update batch rpc error:', error);
    throw new Error('Failed to create event update batch');
  }

  if (!data || data.length === 0) {
    return null;
  }

  return toBatch(data[0] as EventUpdateBatchRow);
}

export async function setEventUpdateBatchWorkflowRunId(input: {
  batchId: string;
  workflowRunId: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_update_batches')
    .update({
      workflow_run_id: input.workflowRunId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.batchId);

  if (error) {
    console.error('Event update batch workflow run update error:', error);
    throw new Error('Failed to update event update batch workflow run');
  }
}

export async function getEventUpdateBatch(
  batchId: string,
): Promise<EventUpdateBatch | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_update_batches')
    .select('id, status, workflow_run_id, created_at, updated_at')
    .eq('id', batchId)
    .maybeSingle();

  if (error) {
    console.error('Event update batch fetch error:', error);
    throw new Error('Failed to fetch event update batch');
  }

  return data ? toBatch(data as EventUpdateBatchRow) : null;
}

export async function getPendingEventUpdateBatchItems(
  batchId: string,
): Promise<EventUpdateBatchItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_update_batch_items')
    .select(
      'id, batch_id, event_id, target_year, source_url, status, error, created_at, updated_at',
    )
    .eq('batch_id', batchId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Event update batch items fetch error:', error);
    throw new Error('Failed to fetch event update batch items');
  }

  return ((data ?? []) as EventUpdateBatchItemRow[]).map(toItem);
}

export async function updateEventUpdateBatchStatus(
  batchId: string,
  status: EventUpdateBatchStatus,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_update_batches')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  if (error) {
    console.error('Event update batch status update error:', error);
    throw new Error('Failed to update event update batch status');
  }
}

export async function markEventUpdateItemRunning(
  itemId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_update_batch_items')
    .update({
      status: 'running',
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event update item running update error:', error);
    throw new Error('Failed to update event update item');
  }
}

export async function markEventUpdateItemCompleted(
  itemId: string,
  input: {
    error?: string | null;
  } = {},
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_update_batch_items')
    .update({
      status: 'completed',
      error: input.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event update item completed update error:', error);
    throw new Error('Failed to complete event update item');
  }
}

export async function markEventUpdateItemFailed(
  itemId: string,
  errorMessage: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('event_update_batch_items')
    .update({
      status: 'failed',
      error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Event update item failed update error:', error);
    throw new Error('Failed to fail event update item');
  }
}
