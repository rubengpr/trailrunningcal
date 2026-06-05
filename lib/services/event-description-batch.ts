import { start } from 'workflow/api';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import {
  createEventDescriptionBatch,
  getEventDescriptionBatch,
  getEventDescriptionBatchSnapshotData,
  getPendingEventDescriptionItems,
  markEventDescriptionItemCompleted,
  markEventDescriptionItemFailed,
  markEventDescriptionItemRunning,
  setEventDescriptionBatchWorkflowRunId,
  updateEventDescriptionBatchStatus,
} from '@/lib/db/event-description-batches';
import { generateEventDescriptionDraft } from '@/lib/services/event-description';
import type {
  EventDescriptionBatchItem,
  EventDescriptionBatchSnapshot,
} from '@/types/event-description.types';

interface EventDescriptionBatchWorkflowInput {
  batchId: string;
}

function buildSummary(items: EventDescriptionBatchItem[]) {
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

export async function getEventDescriptionBatchStatus(
  batchId: string,
): Promise<EventDescriptionBatchSnapshot | null> {
  const data = await getEventDescriptionBatchSnapshotData(batchId);

  if (!data) {
    return null;
  }

  return {
    batch: data.batch,
    summary: buildSummary(data.items),
    items: data.items,
  };
}

export async function startEventDescriptionBatch(input: {
  eventIds: string[];
  model: OpenRouterScrapeModelId;
}): Promise<{ batchId: string; workflowRunId: string }> {
  const batch = await createEventDescriptionBatch(input);

  try {
    const run = await start(eventDescriptionBatchWorkflow, [
      {
        batchId: batch.id,
      },
    ]);

    await setEventDescriptionBatchWorkflowRunId({
      batchId: batch.id,
      workflowRunId: run.runId,
    });

    return {
      batchId: batch.id,
      workflowRunId: run.runId,
    };
  } catch (error) {
    await updateEventDescriptionBatchStatus(batch.id, 'failed');
    throw error;
  }
}

async function markBatchRunningStep(batchId: string): Promise<void> {
  'use step';

  console.log('Starting event description batch', { batchId });
  await updateEventDescriptionBatchStatus(batchId, 'running');
}

async function markBatchCompletedStep(batchId: string): Promise<void> {
  'use step';

  console.log('Completing event description batch', { batchId });
  await updateEventDescriptionBatchStatus(batchId, 'completed');
}

async function markBatchFailedStep(batchId: string): Promise<void> {
  'use step';

  console.error('Failing event description batch', { batchId });
  await updateEventDescriptionBatchStatus(batchId, 'failed');
}

async function getEventDescriptionBatchStep(batchId: string) {
  'use step';

  const batch = await getEventDescriptionBatch(batchId);

  if (!batch) {
    throw new Error('Event description batch not found');
  }

  return batch;
}

async function getPendingBatchItemsStep(batchId: string) {
  'use step';

  return getPendingEventDescriptionItems(batchId);
}

async function processEventDescriptionItemStep(input: {
  itemId: string;
  eventId: string;
  model: OpenRouterScrapeModelId;
}): Promise<void> {
  'use step';

  try {
    console.log('Processing event description item', {
      itemId: input.itemId,
      eventId: input.eventId,
    });

    await markEventDescriptionItemRunning(input.itemId);

    const result = await generateEventDescriptionDraft(
      input.eventId,
      input.model,
    );

    if (result.errorMessage) {
      throw new Error(result.errorMessage);
    }

    await markEventDescriptionItemCompleted(input.itemId, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error('Event description item failed', {
      itemId: input.itemId,
      eventId: input.eventId,
      error: message,
    });

    await markEventDescriptionItemFailed(input.itemId, message);
  }
}

export async function eventDescriptionBatchWorkflow(
  input: EventDescriptionBatchWorkflowInput,
): Promise<void> {
  'use workflow';

  try {
    await markBatchRunningStep(input.batchId);

    const batch = await getEventDescriptionBatchStep(input.batchId);
    const items = await getPendingBatchItemsStep(input.batchId);

    for (const item of items) {
      await processEventDescriptionItemStep({
        itemId: item.id,
        eventId: item.eventId,
        model: batch.model,
      });
    }

    await markBatchCompletedStep(input.batchId);
  } catch (error) {
    await markBatchFailedStep(input.batchId);
    throw error;
  }
}
