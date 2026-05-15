import { start } from 'workflow/api';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { checkDuplicateRaces } from '@/lib/guards/duplicate-races';
import { TimeoutError } from '@/lib/errors';
import {
  createRaceImportBatch,
  getPendingBatchItems,
  getRaceImportBatch,
  markBatchItemCompleted,
  markBatchItemFailed,
  markBatchItemRunning,
  setBatchWorkflowRunId,
  updateBatchStatus,
} from '@/lib/db/race-import-batches';
import { processCrawlSiteExtract } from '@/lib/services/race-import';

interface RaceImportBatchWorkflowInput {
  batchId: string;
}

export async function startRaceImportBatch(input: {
  urls: string[];
  model: OpenRouterScrapeModelId;
}): Promise<{ batchId: string; workflowRunId: string }> {
  await checkDuplicateRaces(input.urls);
  const batch = await createRaceImportBatch(input);

  try {
    const run = await start(raceImportBatchWorkflow, [
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

  console.log('Starting race import batch', { batchId });
  await updateBatchStatus(batchId, 'running');
}

async function markBatchCompletedStep(batchId: string): Promise<void> {
  'use step';

  console.log('Completing race import batch', { batchId });
  await updateBatchStatus(batchId, 'completed');
}

async function markBatchFailedStep(batchId: string): Promise<void> {
  'use step';

  console.error('Failing race import batch', { batchId });
  await updateBatchStatus(batchId, 'failed');
}

async function getRaceImportBatchStep(batchId: string) {
  'use step';

  const batch = await getRaceImportBatch(batchId);

  if (!batch) {
    throw new Error('Race import batch not found');
  }

  return batch;
}

async function getPendingBatchItemsStep(batchId: string) {
  'use step';

  return getPendingBatchItems(batchId);
}

async function processRaceImportItemStep(input: {
  itemId: string;
  url: string;
  model: OpenRouterScrapeModelId;
}): Promise<void> {
  'use step';

  try {
    console.log('Processing race import item', {
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

    console.error('Race import item failed', {
      itemId: input.itemId,
      url: input.url,
      error: message,
    });

    await markBatchItemFailed(input.itemId, message);
  }
}

export async function raceImportBatchWorkflow(
  input: RaceImportBatchWorkflowInput,
): Promise<void> {
  'use workflow';

  try {
    await markBatchRunningStep(input.batchId);

    const batch = await getRaceImportBatchStep(input.batchId);
    const items = await getPendingBatchItemsStep(input.batchId);

    for (const item of items) {
      await processRaceImportItemStep({
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
