import { start } from 'workflow/api';

import { parseEventInput } from '@/app/api/events/validation';
import {
  completeEventResearchItem,
  createEventResearchBatch,
  failEventResearchItem,
  getEventResearchBatch,
  listEventResearchBatches,
  getEventResearchItem,
  getEventResearchItems,
  retryEventResearchItem as retryItemInDatabase,
  setEventResearchWorkflowRunId,
  startEventResearchItem,
  updateEventResearchBatchStatus,
} from '@/lib/db/event-research-batches';
import { ValidationError } from '@/lib/errors';
import { researchEvent } from '@/lib/integrations/openai/event-research';
import type {
  EventResearchBatchItem,
  EventResearchBatchHistoryEntry,
  EventResearchBatchSnapshot,
} from '@/types/event-research.types';
import type { TrailEventAgentParsed } from '@/types/trail-event-agent.types';

interface BatchWorkflowInput {
  batchId: string;
}

interface RetryWorkflowInput extends BatchWorkflowInput {
  itemId: string;
  eventName: string;
}

function buildSummary(items: EventResearchBatchItem[]) {
  return items.reduce(
    (summary, item) => ({
      ...summary,
      [item.status]: summary[item.status] + 1,
    }),
    { total: items.length, pending: 0, running: 0, completed: 0, failed: 0 },
  );
}

function validateNegativeResult(result: TrailEventAgentParsed): void {
  if (
    result.races.length !== 0 ||
    typeof result.errorMessage !== 'string' ||
    result.errorMessage.trim().length === 0
  ) {
    throw new Error('Invalid negative research response');
  }

  if (result.event !== null) {
    const { name, description, websiteUrl } = result.event;
    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      (description !== null && typeof description !== 'string') ||
      (websiteUrl !== null && typeof websiteUrl !== 'string')
    ) {
      throw new Error('Invalid negative research response');
    }
  }
}

export async function getEventResearchBatchStatus(
  batchId: string,
): Promise<EventResearchBatchSnapshot | null> {
  const [batch, items] = await Promise.all([
    getEventResearchBatch(batchId),
    getEventResearchItems(batchId),
  ]);

  if (!batch) return null;
  return { batch, summary: buildSummary(items), items };
}

export async function listEventResearchBatchHistory(): Promise<
  EventResearchBatchHistoryEntry[]
> {
  const batches = await listEventResearchBatches();
  const entries = await Promise.all(
    batches.map(async (batch) => ({
      batch,
      summary: buildSummary(await getEventResearchItems(batch.id)),
    })),
  );

  return entries;
}

export async function startEventResearchBatch(eventNames: string[]): Promise<{
  batchId: string;
  workflowRunId: string;
}> {
  const batch = await createEventResearchBatch(eventNames);

  try {
    const run = await start(eventResearchBatchWorkflow, [{ batchId: batch.id }]);
    await setEventResearchWorkflowRunId({
      batchId: batch.id,
      workflowRunId: run.runId,
    });
    return { batchId: batch.id, workflowRunId: run.runId };
  } catch (error) {
    await updateEventResearchBatchStatus(batch.id, 'failed');
    throw error;
  }
}

export async function retryEventResearchItem(itemId: string): Promise<{
  batchId: string;
  itemId: string;
  workflowRunId: string;
}> {
  const item = await getEventResearchItem(itemId);
  if (!item) throw new ValidationError('Research item not found', 404);

  const pending = await retryItemInDatabase(itemId);
  let run;
  try {
    run = await start(eventResearchRetryWorkflow, [pending]);
  } catch (error) {
    const started = await startEventResearchItem(pending.itemId);
    if (started) {
      await failEventResearchItem({
        itemId: pending.itemId,
        error: 'scheduling_error',
      });
    }
    await updateEventResearchBatchStatus(pending.batchId, 'completed');
    throw error;
  }

  try {
    await setEventResearchWorkflowRunId({
      batchId: pending.batchId,
      workflowRunId: run.runId,
    });
  } catch (error) {
    console.error('Event research retry workflow id update failed', {
      batchId: pending.batchId,
      workflowRunId: run.runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return {
    batchId: pending.batchId,
    itemId: pending.itemId,
    workflowRunId: run.runId,
  };
}

async function markBatchStatusStep(
  batchId: string,
  status: 'running' | 'completed' | 'failed',
): Promise<void> {
  'use step';
  await updateEventResearchBatchStatus(batchId, status);
}

async function getBatchStep(batchId: string) {
  'use step';
  const batch = await getEventResearchBatch(batchId);
  if (!batch) throw new Error('Event research batch not found');
  return batch;
}

async function getPendingItemsStep(batchId: string) {
  'use step';
  return getEventResearchItems(batchId, 'pending');
}

async function processItemStep(input: {
  batchId: string;
  itemId: string;
  eventName: string;
}): Promise<void> {
  'use step';

  const started = await startEventResearchItem(input.itemId);
  if (!started) return;

  let rootSpanId: string | null = null;
  try {
    const run = await researchEvent({
      eventName: input.eventName,
      traceMetadata: {
        batchId: input.batchId,
        itemId: input.itemId,
        workflow: 'admin-event-research',
      },
    });
    rootSpanId = run.braintrustRootSpanId;

    if (run.failure) {
      await failEventResearchItem({
        itemId: input.itemId,
        error: run.failure,
        braintrustRootSpanId: rootSpanId,
      });
      return;
    }
    if (!run.result || !run.response) {
      throw new Error('Invalid research response');
    }

    const isDraft =
      run.result.event !== null &&
      run.result.races.length > 0 &&
      run.result.errorMessage === null;
    let draftData;
    let sourceUrl: string | null = null;

    if (isDraft) {
      const parsed = parseEventInput(run.result);
      draftData = { event: parsed.event, races: parsed.races };
      sourceUrl = parsed.event.websiteUrl;
    } else {
      validateNegativeResult(run.result);
    }

    await completeEventResearchItem({
      itemId: input.itemId,
      result: run.result,
      sources: run.response.sources,
      usage: run.response.usage,
      openAIResponseId: run.response.id,
      braintrustRootSpanId: rootSpanId,
      raceCount: run.result.races.length,
      draftData,
      sourceUrl,
    });
  } catch (error) {
    console.error('Event research item failed', {
      itemId: input.itemId,
      eventName: input.eventName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    await failEventResearchItem({
      itemId: input.itemId,
      error: 'processing_error',
      braintrustRootSpanId: rootSpanId,
    });
  }
}

async function recomputeBatchStatusStep(batchId: string): Promise<void> {
  'use step';
  const items = await getEventResearchItems(batchId);
  const complete = items.every(
    (item) => item.status === 'completed' || item.status === 'failed',
  );
  await updateEventResearchBatchStatus(batchId, complete ? 'completed' : 'running');
}

export async function eventResearchBatchWorkflow(
  input: BatchWorkflowInput,
): Promise<void> {
  'use workflow';

  try {
    await markBatchStatusStep(input.batchId, 'running');
    const batch = await getBatchStep(input.batchId);
    const items = await getPendingItemsStep(input.batchId);

    for (let index = 0; index < items.length; index += batch.concurrency) {
      const group = items.slice(index, index + batch.concurrency);
      await Promise.all(
        group.map((item) =>
          processItemStep({
            batchId: input.batchId,
            itemId: item.id,
            eventName: item.eventName,
          }),
        ),
      );
    }

    await markBatchStatusStep(input.batchId, 'completed');
  } catch (error) {
    await markBatchStatusStep(input.batchId, 'failed');
    throw error;
  }
}

export async function eventResearchRetryWorkflow(
  input: RetryWorkflowInput,
): Promise<void> {
  'use workflow';

  await processItemStep(input);
  await recomputeBatchStatusStep(input.batchId);
}
