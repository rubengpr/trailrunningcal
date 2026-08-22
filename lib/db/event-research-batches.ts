import { ValidationError } from '@/lib/errors';
import {
  EVENT_RESEARCH_CONCURRENCY,
  EVENT_RESEARCH_MODEL,
  EVENT_RESEARCH_PROMPT_SLUG,
  EVENT_RESEARCH_PROMPT_VERSION,
  EVENT_RESEARCH_SEARCH_CONTEXT_SIZE,
} from '@/lib/event-research/config';
import { createAdminClient } from '@/lib/supabase/server';
import type { EventImportDraftData } from '@/types/event-import-draft.types';
import type {
  EventResearchBatch,
  EventResearchBatchItem,
  EventResearchBatchItemRow,
  EventResearchBatchRow,
  EventResearchBatchStatus,
  EventResearchUsage,
} from '@/types/event-research.types';
import type { TrailEventAgentParsed } from '@/types/trail-event-agent.types';

function toBatch(row: EventResearchBatchRow): EventResearchBatch {
  return {
    id: row.id,
    status: row.status,
    model: row.model,
    promptSlug: row.prompt_slug,
    promptVersion: row.prompt_version,
    searchContextSize: row.search_context_size,
    concurrency: row.concurrency,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: EventResearchBatchItemRow): EventResearchBatchItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    eventName: row.event_name,
    status: row.status,
    result: row.result,
    sources: row.sources,
    usage: row.usage,
    openAIResponseId: row.openai_response_id,
    braintrustRootSpanId: row.braintrust_root_span_id,
    raceCount: row.race_count,
    attemptCount: row.attempt_count,
    error: row.error,
    draftId: row.draft_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEventResearchBatch(
  eventNames: string[],
): Promise<EventResearchBatch> {
  const { data, error } = await createAdminClient().rpc(
    'create_event_research_batch',
    {
      p_event_names: eventNames,
      p_model: EVENT_RESEARCH_MODEL,
      p_prompt_slug: EVENT_RESEARCH_PROMPT_SLUG,
      p_prompt_version: EVENT_RESEARCH_PROMPT_VERSION,
      p_search_context_size: EVENT_RESEARCH_SEARCH_CONTEXT_SIZE,
      p_concurrency: EVENT_RESEARCH_CONCURRENCY,
    },
  );

  if (error || !Array.isArray(data) || data.length === 0) {
    console.error('Event research batch create error:', error);
    throw new Error('Failed to create event research batch');
  }

  return toBatch(data[0] as EventResearchBatchRow);
}

export async function setEventResearchWorkflowRunId(input: {
  batchId: string;
  workflowRunId: string;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_research_batches')
    .update({
      workflow_run_id: input.workflowRunId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.batchId);

  if (error) {
    console.error('Event research workflow id update error:', error);
    throw new Error('Failed to update event research workflow');
  }
}

export async function getEventResearchBatch(
  batchId: string,
): Promise<EventResearchBatch | null> {
  const { data, error } = await createAdminClient()
    .from('event_research_batches')
    .select('*')
    .eq('id', batchId)
    .maybeSingle();

  if (error) {
    console.error('Event research batch fetch error:', error);
    throw new Error('Failed to fetch event research batch');
  }

  return data ? toBatch(data as EventResearchBatchRow) : null;
}

export async function listEventResearchBatches(
  limit = 20,
): Promise<EventResearchBatch[]> {
  const { data, error } = await createAdminClient()
    .from('event_research_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Event research batches fetch error:', error);
    throw new Error('Failed to fetch event research batches');
  }

  return ((data ?? []) as EventResearchBatchRow[]).map(toBatch);
}

export async function getEventResearchItems(
  batchId: string,
  status?: EventResearchBatchItem['status'],
): Promise<EventResearchBatchItem[]> {
  let query = createAdminClient()
    .from('event_research_batch_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (status) query = query.eq('status', status);
  const { data, error } = await query;

  if (error) {
    console.error('Event research items fetch error:', error);
    throw new Error('Failed to fetch event research items');
  }

  return ((data ?? []) as EventResearchBatchItemRow[]).map(toItem);
}

export async function getEventResearchItem(
  itemId: string,
): Promise<EventResearchBatchItem | null> {
  const { data, error } = await createAdminClient()
    .from('event_research_batch_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    console.error('Event research item fetch error:', error);
    throw new Error('Failed to fetch event research item');
  }

  return data ? toItem(data as EventResearchBatchItemRow) : null;
}

export async function updateEventResearchBatchStatus(
  batchId: string,
  status: EventResearchBatchStatus,
): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_research_batches')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', batchId);

  if (error) {
    console.error('Event research batch status update error:', error);
    throw new Error('Failed to update event research batch');
  }
}

export async function startEventResearchItem(itemId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc(
    'start_event_research_item',
    { p_item_id: itemId },
  );

  if (error) {
    console.error('Event research item start error:', error);
    throw new Error('Failed to start event research item');
  }

  return data === true;
}

export async function completeEventResearchItem(input: {
  itemId: string;
  result: TrailEventAgentParsed;
  sources: string[];
  usage: EventResearchUsage;
  openAIResponseId: string;
  braintrustRootSpanId: string;
  raceCount: number;
  draftData?: EventImportDraftData;
  sourceUrl?: string | null;
}): Promise<string | null> {
  const { data, error } = await createAdminClient().rpc(
    'complete_event_research_item',
    {
      p_item_id: input.itemId,
      p_result: input.result,
      p_sources: input.sources,
      p_usage: input.usage,
      p_openai_response_id: input.openAIResponseId,
      p_braintrust_root_span_id: input.braintrustRootSpanId,
      p_race_count: input.raceCount,
      p_draft_data: input.draftData ?? null,
      p_source_url: input.sourceUrl ?? null,
    },
  );

  if (error || typeof data !== 'object' || data === null || Array.isArray(data)) {
    console.error('Event research item complete error:', error);
    throw new Error('Failed to complete event research item');
  }

  return typeof data.draft_id === 'string' ? data.draft_id : null;
}

export async function failEventResearchItem(input: {
  itemId: string;
  error: string;
  braintrustRootSpanId?: string | null;
}): Promise<void> {
  const { data, error } = await createAdminClient().rpc(
    'fail_event_research_item',
    {
      p_item_id: input.itemId,
      p_error: input.error,
      p_braintrust_root_span_id: input.braintrustRootSpanId ?? null,
    },
  );

  if (error || data !== true) {
    console.error('Event research item fail error:', error);
    throw new Error('Failed to fail event research item');
  }
}

export async function retryEventResearchItem(itemId: string): Promise<{
  batchId: string;
  itemId: string;
  eventName: string;
}> {
  const { data, error } = await createAdminClient().rpc(
    'retry_event_research_item',
    { p_item_id: itemId },
  );

  if (error) {
    if (error.code === 'P0004') {
      throw new ValidationError('Research item is not retryable', 409);
    }
    console.error('Event research item retry error:', error);
    throw new Error('Failed to retry event research item');
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data) ||
    typeof data.batch_id !== 'string' ||
    typeof data.item_id !== 'string' ||
    typeof data.event_name !== 'string'
  ) {
    throw new Error('Failed to retry event research item');
  }

  return {
    batchId: data.batch_id,
    itemId: data.item_id,
    eventName: data.event_name,
  };
}
