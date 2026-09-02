import { start } from 'workflow/api';
import { evaluateEditionSignal } from '@/lib/event-updates/edition-signal';
import { ValidationError } from '@/lib/errors';
import {
  createEventUpdateBatch,
  completeEventUpdateItemWithDraft,
  getEventUpdateBatch,
  getPendingEventUpdateBatchItems,
  markEventUpdateItemFailed,
  markEventUpdateItemRunning,
  markEventUpdateItemSkipped,
  setEventUpdateBatchWorkflowRunId,
  setEventUpdateItemAttemptWorkflowRunId,
  retryEventUpdateBatchItem as retryEventUpdateBatchItemInDatabase,
  failPendingEventUpdateItemAttempt,
  updateEventUpdateBatchStatus,
  getEventUpdateBatchSnapshot as getEventUpdateBatchSnapshotInDb,
  listEventUpdateBatchHistory as listEventUpdateBatchHistoryInDb,
} from '@/lib/db/event-update-batches';
import type {
  EventUpdateBatchHistoryEntry,
  EventUpdateBatchSnapshot,
} from '@/types/event-update.types';
import { crawlSite } from '@/lib/services/crawl';
import { extractEventDraftDataFromMarkdown } from '@/lib/services/event-drafts';

interface EventUpdateBatchWorkflowInput {
  batchId: string;
}

export interface EventUpdateBatchStartResult {
  batchId: string | null;
  workflowRunId: string | null;
}

export async function getEventUpdateBatchStatus(
  batchId: string,
): Promise<EventUpdateBatchSnapshot | null> {
  return getEventUpdateBatchSnapshotInDb(batchId);
}

export async function listEventUpdateBatchHistory(): Promise<
  EventUpdateBatchHistoryEntry[]
> {
  return listEventUpdateBatchHistoryInDb();
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
    await updateEventUpdateBatchStatus({ batchId: batch.id, status: 'failed', failureReason: 'Unable to start workflow' });
    throw error;
  }
}

async function markBatchRunningStep(batchId: string): Promise<void> {
  'use step';

  console.log('Starting event update batch', { batchId });
  await updateEventUpdateBatchStatus({ batchId, status: 'running' });
}

async function markBatchCompletedStep(batchId: string): Promise<void> {
  'use step';

  console.log('Completing event update batch', { batchId });
  await updateEventUpdateBatchStatus({ batchId, status: 'completed' });
}

async function markBatchFailedStep(batchId: string, failureReason: string): Promise<void> {
  'use step';

  console.error('Failing event update batch', { batchId });
  await updateEventUpdateBatchStatus({ batchId, status: 'failed', failureReason });
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

    const started = await markEventUpdateItemRunning(input.itemId);
    if (!started) return;

    const crawl = await crawlSite(input.sourceUrl);
    const signal = evaluateEditionSignal({
      markdown: crawl.markdown,
      targetYear: input.targetYear,
    });

    if (!signal.eligible) {
      await markEventUpdateItemSkipped(
        input.itemId,
        signal.reason.replace(/^Skipped:\s*/, ''),
      );
      return;
    }

    const draftData = await extractEventDraftDataFromMarkdown({
      markdown: crawl.markdown,
    });
    await completeEventUpdateItemWithDraft({
      itemId: input.itemId,
      draftData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof ValidationError) {
      await markEventUpdateItemSkipped(input.itemId, message);
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

export async function retryEventUpdateBatchItem(input: {
  batchId: string;
  itemId: string;
}): Promise<{
  batchId: string;
  itemId: string;
  workflowRunId: string;
}> {
  const batch = await getEventUpdateBatch(input.batchId);
  if (!batch) throw new ValidationError('Event update batch not found', 404);

  const pending = await retryEventUpdateBatchItemInDatabase(input);

  let run;
  try {
    run = await start(eventUpdateItemRetryWorkflow, [pending]);
  } catch (error) {
    await failPendingEventUpdateItemAttempt({
      itemId: pending.itemId,
      errorMessage: 'Unable to start retry workflow',
    });
    throw error;
  }

  try {
    await setEventUpdateItemAttemptWorkflowRunId({
      itemId: pending.itemId,
      workflowRunId: run.runId,
    });
  } catch (error) {
    console.error('Event update item retry workflow id update failed', {
      batchId: pending.batchId,
      itemId: pending.itemId,
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
    await markBatchFailedStep(
      input.batchId,
      error instanceof Error && error.message === 'Event update batch not found'
        ? 'Batch record was not found'
        : 'Workflow did not finish',
    );
    throw error;
  }
}

export async function eventUpdateItemRetryWorkflow(input: {
  itemId: string;
  eventId: string;
  sourceUrl: string;
  targetYear: number;
}): Promise<void> {
  'use workflow';

  await processEventUpdateItemStep(input);
}
