import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type {
  EventUpdateBatch,
  EventUpdateBatchItem,
  EventUpdateBatchItemRow,
  EventUpdateBatchRow,
  EventUpdateBatchStatus,
  EventUpdateBatchHistoryEntry,
  EventUpdateBatchSnapshot,
  EventUpdateBatchSummary,
} from '@/types/event-update.types';

function toBatch(row: EventUpdateBatchRow): EventUpdateBatch {
  return {
    id: row.id,
    status: row.status,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
    failureReason: row.failure_reason,
  };
}

function toItem(row: EventUpdateBatchItemRow): EventUpdateBatchItem {
  const event = Array.isArray(row.events) ? row.events[0] : row.events;

  return {
    id: row.id,
    batchId: row.batch_id,
    eventId: row.event_id,
    targetYear: row.target_year,
    sourceUrl: row.source_url,
    status: row.status,
    error: row.error,
    outcome: row.outcome,
    draftId: row.draft_id,
    skipReason: row.skip_reason,
    eventName: event?.name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const itemStatusOrder: Record<EventUpdateBatchStatus, number> = {
  completed: 0,
  running: 1,
  pending: 2,
  failed: 3,
};

function sortBatchItems(items: EventUpdateBatchItem[]): EventUpdateBatchItem[] {
  return items.sort((left, right) => (
    itemStatusOrder[left.status] - itemStatusOrder[right.status]
    || new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  ));
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
    .select('id, status, workflow_run_id, created_at, updated_at, finished_at, failure_reason')
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
      'id, batch_id, event_id, target_year, source_url, status, error, outcome, draft_id, skip_reason, created_at, updated_at, events(name)',
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

export async function updateEventUpdateBatchStatus(input: {
  batchId: string;
  status: EventUpdateBatchStatus;
  failureReason?: string | null;
}): Promise<void> {
  const isTerminal = input.status === 'completed' || input.status === 'failed';
  const { error } = await createAdminClient()
    .from('event_update_batches')
    .update({
      status: input.status,
      finished_at: isTerminal ? new Date().toISOString() : null,
      failure_reason: input.status === 'failed' ? input.failureReason ?? 'Workflow failed' : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.batchId);

  if (error) {
    console.error('Event update batch status update error:', error);
    throw new Error('Failed to update event update batch status');
  }
}

export async function resumeEventUpdateBatch(batchId: string): Promise<number> {
  const { data, error } = await createAdminClient().rpc('resume_event_update_batch', {
    p_batch_id: batchId,
  });

  if (error?.code === 'P0004') {
    throw new ValidationError('Event update batch is not resumable', 409);
  }
  if (error || typeof data !== 'number') {
    console.error('Event update batch resume error:', error);
    throw new Error('Failed to resume event update batch');
  }

  return data;
}

export async function listEventUpdateBatchHistory(): Promise<EventUpdateBatchHistoryEntry[]> {
  const { data, error } = await createAdminClient().rpc('list_event_update_batch_history', {
    p_limit: 20,
  });

  if (error) {
    console.error('Event update batch history fetch error:', error);
    throw new Error('Failed to fetch event update batch history');
  }

  return ((data ?? []) as Array<EventUpdateBatchRow & EventUpdateBatchSummary>).map((row) => ({
    batch: toBatch(row),
    summary: {
      total: Number(row.total), drafted: Number(row.drafted), skipped: Number(row.skipped),
      failed: Number(row.failed), pending: Number(row.pending), running: Number(row.running),
    },
  }));
}

export async function getEventUpdateBatchSnapshot(batchId: string): Promise<EventUpdateBatchSnapshot | null> {
  const [batch, items, history] = await Promise.all([
    getEventUpdateBatch(batchId),
    getEventUpdateBatchItems(batchId),
    createAdminClient().rpc('get_event_update_batch_summary', { p_batch_id: batchId }),
  ]);
  const { data, error } = history;
  if (error) {
    console.error('Event update batch summary fetch error:', error);
    throw new Error('Failed to fetch event update batch summary');
  }
  if (!batch || !data || data.length === 0) return null;
  const summary = data[0] as EventUpdateBatchSummary;
  return { batch, items, summary: {
    total: Number(summary.total), drafted: Number(summary.drafted), skipped: Number(summary.skipped),
    failed: Number(summary.failed), pending: Number(summary.pending), running: Number(summary.running),
  } };
}

async function getEventUpdateBatchItems(batchId: string): Promise<EventUpdateBatchItem[]> {
  const { data, error } = await createAdminClient()
    .from('event_update_batch_items')
    .select('id, batch_id, event_id, target_year, source_url, status, error, outcome, draft_id, skip_reason, created_at, updated_at, events(name)')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Event update batch items fetch error:', error);
    throw new Error('Failed to fetch event update batch items');
  }
  return sortBatchItems(((data ?? []) as EventUpdateBatchItemRow[]).map(toItem));
}

export async function completeEventUpdateItemWithDraft(input: {
  itemId: string;
  draftData: import('@/types/event-draft.types').EventDraftData;
}): Promise<string> {
  const { data, error } = await createAdminClient().rpc('complete_event_update_item_with_draft', {
    p_item_id: input.itemId,
    p_draft_data: input.draftData,
  });
  if (error?.code === '23505') {
    throw new ValidationError('Event already has a pending draft', 409);
  }
  if (error || typeof data !== 'string') {
    console.error('Event update item draft completion error:', error);
    throw new Error('Failed to complete event update item');
  }
  return data;
}

export async function markEventUpdateItemSkipped(itemId: string, skipReason: string): Promise<void> {
  const { error } = await createAdminClient().rpc('mark_event_update_item_skipped', {
    p_item_id: itemId,
    p_skip_reason: skipReason,
  });

  if (error) {
    console.error('Event update item skip error:', error);
    throw new Error('Failed to skip event update item');
  }
}

export async function markEventUpdateItemRunning(
  itemId: string,
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('start_event_update_item_attempt', {
    p_item_id: itemId,
  });

  if (error) {
    console.error('Event update item running update error:', error);
    throw new Error('Failed to update event update item');
  }

  return data === true;
}

export async function markEventUpdateItemFailed(
  itemId: string,
  errorMessage: string,
): Promise<void> {
  const { error } = await createAdminClient().rpc('fail_event_update_item', {
    p_item_id: itemId,
    p_error: errorMessage,
  });

  if (error) {
    console.error('Event update item failed update error:', error);
    throw new Error('Failed to fail event update item');
  }
}

export interface EventUpdateRetryInput {
  batchId: string;
  itemId: string;
  eventId: string;
  sourceUrl: string;
  targetYear: number;
}

export async function retryEventUpdateBatchItem(input: {
  batchId: string;
  itemId: string;
}): Promise<EventUpdateRetryInput> {
  const { data, error } = await createAdminClient().rpc('retry_event_update_batch_item', {
    p_batch_id: input.batchId,
    p_item_id: input.itemId,
  });

  if (error?.code === 'P0004') {
    throw new ValidationError('Event update item is not retryable', 409);
  }
  if (error || !data || typeof data !== 'object') {
    console.error('Event update item retry error:', error);
    throw new Error('Failed to retry event update item');
  }

  const pending = data as {
    batch_id?: unknown;
    item_id?: unknown;
    event_id?: unknown;
    source_url?: unknown;
    target_year?: unknown;
  };
  if (
    typeof pending.batch_id !== 'string'
    || typeof pending.item_id !== 'string'
    || typeof pending.event_id !== 'string'
    || typeof pending.source_url !== 'string'
    || typeof pending.target_year !== 'number'
  ) {
    throw new Error('Failed to retry event update item');
  }

  return {
    batchId: pending.batch_id,
    itemId: pending.item_id,
    eventId: pending.event_id,
    sourceUrl: pending.source_url,
    targetYear: pending.target_year,
  };
}

export async function setEventUpdateItemAttemptWorkflowRunId(input: {
  itemId: string;
  workflowRunId: string;
}): Promise<void> {
  const { error } = await createAdminClient().rpc('set_event_update_item_attempt_workflow_run_id', {
    p_item_id: input.itemId,
    p_workflow_run_id: input.workflowRunId,
  });

  if (error) {
    console.error('Event update item workflow run update error:', error);
    throw new Error('Failed to update event update item workflow run');
  }
}

export async function failPendingEventUpdateItemAttempt(input: {
  itemId: string;
  errorMessage: string;
}): Promise<void> {
  const { error } = await createAdminClient().rpc('fail_pending_event_update_item_attempt', {
    p_item_id: input.itemId,
    p_error: input.errorMessage,
  });

  if (error) {
    console.error('Pending event update item failure error:', error);
    throw new Error('Failed to fail pending event update item');
  }
}
