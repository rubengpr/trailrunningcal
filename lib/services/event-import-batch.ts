import { start } from 'workflow/api';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { checkDuplicateEvents } from '@/lib/guards/duplicate-events';
import {
  MarkdownTooLongError,
  MarkdownTooShortError,
  ValidationError,
} from '@/lib/errors';
import {
  createEventImportBatch,
  acceptItem as acceptItemInDatabase,
  getBatchSnapshotData,
  getItemResultState,
  getPendingBatchItems,
  getEventImportBatch,
  markBatchItemCompleted,
  markBatchItemFailed,
  markBatchItemRunning,
  saveItemResult,
  setBatchWorkflowRunId,
  updateBatchStatus,
} from '@/lib/db/event-import-batches';
import { processCrawlSiteExtract } from '@/lib/services/event-import';
import type {
  EventImportBatchItem,
  EventImportBatchSnapshot,
  EventImportResult,
} from '@/types/events-import-api.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface EventImportBatchWorkflowInput {
  batchId: string;
}

function buildSummary(items: EventImportBatchItem[]) {
  return items.reduce(
    (summary, item) => ({
      ...summary,
      [item.status]: summary[item.status] + 1,
    }),
    {
      total: items.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    },
  );
}

export async function getBatchStatus(
  batchId: string,
): Promise<EventImportBatchSnapshot | null> {
  const data = await getBatchSnapshotData(batchId);

  if (!data) {
    return null;
  }

  return {
    batch: data.batch,
    summary: buildSummary(data.items),
    items: data.items,
  };
}

export async function updateItemResult(
  itemId: string,
  input: {
    event: TrailEventAgentEvent;
    races: TrailEventAgentRace[];
  },
): Promise<EventImportResult> {
  const current = await getItemResultState(itemId);

  if (!current) {
    throw new ValidationError('Item not found', 404);
  }

  if (current.reviewStatus === 'accepted') {
    throw new ValidationError('Accepted items cannot be edited', 409);
  }

  const updated = await saveItemResult(itemId, {
    ...current.result,
    event: input.event,
    races: input.races,
  });

  if (!updated) {
    const latest = await getItemResultState(itemId);

    if (latest?.reviewStatus === 'accepted') {
      throw new ValidationError('Accepted items cannot be edited', 409);
    }

    throw new ValidationError('Item not found', 404);
  }

  return updated;
}

export async function acceptItem(itemId: string): Promise<{ eventId: string }> {
  return { eventId: await acceptItemInDatabase(itemId) };
}

export async function startEventImportBatch(input: {
  urls: string[];
  model: OpenRouterScrapeModelId;
}): Promise<{ batchId: string; workflowRunId: string }> {
  await checkDuplicateEvents(input.urls);
  const batch = await createEventImportBatch(input);

  try {
    const run = await start(eventImportBatchWorkflow, [
      {
        batchId: batch.id,
      },
    ]);

    await setBatchWorkflowRunId({
      batchId: batch.id,
      workflowRunId: run.runId,
    });

    return {
      batchId: batch.id,
      workflowRunId: run.runId,
    };
  } catch (error) {
    await updateBatchStatus(batch.id, 'failed');
    throw error;
  }
}

async function markBatchRunningStep(batchId: string): Promise<void> {
  'use step';

  console.log('Starting event import batch', { batchId });
  await updateBatchStatus(batchId, 'running');
}

async function markBatchCompletedStep(batchId: string): Promise<void> {
  'use step';

  console.log('Completing event import batch', { batchId });
  await updateBatchStatus(batchId, 'completed');
}

async function markBatchFailedStep(batchId: string): Promise<void> {
  'use step';

  console.error('Failing event import batch', { batchId });
  await updateBatchStatus(batchId, 'failed');
}

async function getEventImportBatchStep(batchId: string) {
  'use step';

  const batch = await getEventImportBatch(batchId);

  if (!batch) {
    throw new Error('Event import batch not found');
  }

  return batch;
}

async function getPendingBatchItemsStep(batchId: string) {
  'use step';

  return getPendingBatchItems(batchId);
}

async function processEventImportItemStep(input: {
  itemId: string;
  url: string;
  model: OpenRouterScrapeModelId;
}): Promise<void> {
  'use step';

  try {
    console.log('Processing event import item', {
      itemId: input.itemId,
      url: input.url,
    });

    await markBatchItemRunning(input.itemId);

    const result = await processCrawlSiteExtract({
      url: input.url,
      model: input.model,
    });

    await markBatchItemCompleted(input.itemId, {
      result,
      raceCount: result?.races.length ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error('Event import item failed', {
      itemId: input.itemId,
      url: input.url,
      error: message,
    });

    const markdown =
      error instanceof MarkdownTooLongError ||
      error instanceof MarkdownTooShortError
        ? error.markdown
        : undefined;
    await markBatchItemFailed(input.itemId, message, markdown);
  }
}

export async function eventImportBatchWorkflow(
  input: EventImportBatchWorkflowInput,
): Promise<void> {
  'use workflow';

  try {
    await markBatchRunningStep(input.batchId);

    const batch = await getEventImportBatchStep(input.batchId);
    const items = await getPendingBatchItemsStep(input.batchId);

    for (const item of items) {
      await processEventImportItemStep({
        itemId: item.id,
        url: item.url,
        model: batch.model,
      });
    }

    await markBatchCompletedStep(input.batchId);
  } catch (error) {
    await markBatchFailedStep(input.batchId);
    throw error;
  }
}
