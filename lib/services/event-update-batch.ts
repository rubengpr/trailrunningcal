import { start } from 'workflow/api';
import { evaluateEditionSignal } from '@/lib/event-updates/edition-signal';
import { ValidationError } from '@/lib/errors';
import {
  createEventUpdateBatch,
  getEventUpdateBatch,
  getPendingEventUpdateBatchItems,
  markEventUpdateItemCompleted,
  markEventUpdateItemFailed,
  markEventUpdateItemRunning,
  setEventUpdateBatchWorkflowRunId,
  updateEventUpdateBatchStatus,
} from '@/lib/db/event-update-batches';
import { crawlSite } from '@/lib/integrations/spider-cloud/service';
import { generateEventDraftFromMarkdown } from '@/lib/services/event-drafts';

interface EventUpdateBatchWorkflowInput {
  batchId: string;
}

export interface EventUpdateBatchStartResult {
  batchId: string | null;
  workflowRunId: string | null;
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function startEventUpdateBatch(input?: {
  referenceDate?: string;
}): Promise<EventUpdateBatchStartResult> {
  const referenceDate = input?.referenceDate ?? toUtcDateString(new Date());
  const batch = await createEventUpdateBatch({ referenceDate });

  if (!batch) {
    return {
      batchId: null,
      workflowRunId: null,
    };
  }

  try {
    const run = await start(eventUpdateBatchWorkflow, [
      {
        batchId: batch.id,
      },
    ]);

    await setEventUpdateBatchWorkflowRunId({
      batchId: batch.id,
      workflowRunId: run.runId,
    });

    return {
      batchId: batch.id,
      workflowRunId: run.runId,
    };
  } catch (error) {
    await updateEventUpdateBatchStatus(batch.id, 'failed');
    throw error;
  }
}

async function markBatchRunningStep(batchId: string): Promise<void> {
  'use step';

  console.log('Starting event update batch', { batchId });
  await updateEventUpdateBatchStatus(batchId, 'running');
}

async function markBatchCompletedStep(batchId: string): Promise<void> {
  'use step';

  console.log('Completing event update batch', { batchId });
  await updateEventUpdateBatchStatus(batchId, 'completed');
}

async function markBatchFailedStep(batchId: string): Promise<void> {
  'use step';

  console.error('Failing event update batch', { batchId });
  await updateEventUpdateBatchStatus(batchId, 'failed');
}

async function getEventUpdateBatchStep(batchId: string): Promise<void> {
  'use step';

  const batch = await getEventUpdateBatch(batchId);

  if (!batch) {
    throw new Error('Event update batch not found');
  }
}

async function getPendingBatchItemsStep(batchId: string) {
  'use step';

  return getPendingEventUpdateBatchItems(batchId);
}

async function processEventUpdateItemStep(input: {
  itemId: string;
  eventId: string;
  sourceUrl: string;
  targetYear: number;
}): Promise<void> {
  'use step';

  try {
    console.log('Processing event update item', {
      itemId: input.itemId,
      eventId: input.eventId,
      targetYear: input.targetYear,
      sourceUrl: input.sourceUrl,
    });

    await markEventUpdateItemRunning(input.itemId);

    const crawl = await crawlSite(input.sourceUrl);
    const signal = evaluateEditionSignal({
      markdown: crawl.markdown,
      targetYear: input.targetYear,
    });

    if (!signal.eligible) {
      await markEventUpdateItemCompleted(input.itemId, {
        error: signal.reason,
      });
      return;
    }

    await generateEventDraftFromMarkdown({
      eventId: input.eventId,
      markdown: crawl.markdown,
    });

    await markEventUpdateItemCompleted(input.itemId, {
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof ValidationError) {
      await markEventUpdateItemCompleted(input.itemId, {
        error: `Skipped: ${message}`,
      });
      return;
    }

    console.error('Event update item failed', {
      itemId: input.itemId,
      eventId: input.eventId,
      targetYear: input.targetYear,
      sourceUrl: input.sourceUrl,
      error: message,
    });

    await markEventUpdateItemFailed(input.itemId, message);
  }
}

export async function eventUpdateBatchWorkflow(
  input: EventUpdateBatchWorkflowInput,
): Promise<void> {
  'use workflow';

  try {
    await markBatchRunningStep(input.batchId);
    await getEventUpdateBatchStep(input.batchId);

    const items = await getPendingBatchItemsStep(input.batchId);

    for (const item of items) {
      await processEventUpdateItemStep({
        itemId: item.id,
        eventId: item.eventId,
        sourceUrl: item.sourceUrl,
        targetYear: item.targetYear,
      });
    }

    await markBatchCompletedStep(input.batchId);
  } catch (error) {
    await markBatchFailedStep(input.batchId);
    throw error;
  }
}
