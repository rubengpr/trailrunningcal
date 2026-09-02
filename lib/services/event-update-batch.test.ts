import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  EventUpdateBatch,
  EventUpdateBatchItem,
} from '@/types/event-update.types';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  crawlSite: vi.fn(),
  extractEventDraftDataFromMarkdown: vi.fn(),
  completeEventUpdateItemWithDraft: vi.fn(),
  createEventUpdateBatch: vi.fn(),
  getEventUpdateBatch: vi.fn(),
  getPendingEventUpdateBatchItems: vi.fn(),
  markEventUpdateItemSkipped: vi.fn(),
  markEventUpdateItemFailed: vi.fn(),
  markEventUpdateItemRunning: vi.fn(),
  retryEventUpdateBatchItem: vi.fn(),
  resumeEventUpdateBatch: vi.fn(),
  failPendingEventUpdateItemAttempt: vi.fn(),
  setEventUpdateItemAttemptWorkflowRunId: vi.fn(),
  setEventUpdateBatchWorkflowRunId: vi.fn(),
  updateEventUpdateBatchStatus: vi.fn(),
}));

vi.mock('workflow/api', () => ({
  start: mocks.start,
}));

vi.mock('@/lib/services/crawl', () => ({
  crawlSite: mocks.crawlSite,
}));

vi.mock('@/lib/services/event-drafts', () => ({
  extractEventDraftDataFromMarkdown: mocks.extractEventDraftDataFromMarkdown,
}));

vi.mock('@/lib/db/event-update-batches', () => ({
  createEventUpdateBatch: mocks.createEventUpdateBatch,
  getEventUpdateBatch: mocks.getEventUpdateBatch,
  getPendingEventUpdateBatchItems: mocks.getPendingEventUpdateBatchItems,
  completeEventUpdateItemWithDraft: mocks.completeEventUpdateItemWithDraft,
  markEventUpdateItemSkipped: mocks.markEventUpdateItemSkipped,
  markEventUpdateItemFailed: mocks.markEventUpdateItemFailed,
  markEventUpdateItemRunning: mocks.markEventUpdateItemRunning,
  retryEventUpdateBatchItem: mocks.retryEventUpdateBatchItem,
  resumeEventUpdateBatch: mocks.resumeEventUpdateBatch,
  failPendingEventUpdateItemAttempt: mocks.failPendingEventUpdateItemAttempt,
  setEventUpdateItemAttemptWorkflowRunId: mocks.setEventUpdateItemAttemptWorkflowRunId,
  setEventUpdateBatchWorkflowRunId: mocks.setEventUpdateBatchWorkflowRunId,
  updateEventUpdateBatchStatus: mocks.updateEventUpdateBatchStatus,
}));

import {
  eventUpdateBatchWorkflow,
  eventUpdateItemRetryWorkflow,
  retryEventUpdateBatchItem,
  resumeEventUpdateBatch,
  startEventUpdateBatch,
} from './event-update-batch';
import { ValidationError } from '@/lib/errors';

const batch: EventUpdateBatch = {
  id: 'batch-1',
  status: 'pending',
  workflowRunId: null,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
  finishedAt: null,
  failureReason: null,
};

const item = (id: string): EventUpdateBatchItem => ({
  id,
  batchId: batch.id,
  eventId: `event-${id}`,
  targetYear: 2027,
  sourceUrl: `https://example.com/${id}`,
  status: 'pending',
  error: null,
  outcome: null,
  draftId: null,
  skipReason: null,
  eventName: null,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.start.mockResolvedValue({ runId: 'workflow-run-1' });
  mocks.createEventUpdateBatch.mockResolvedValue(batch);
  mocks.getEventUpdateBatch.mockResolvedValue(batch);
  mocks.getPendingEventUpdateBatchItems.mockResolvedValue([]);
  mocks.markEventUpdateItemRunning.mockResolvedValue(true);
  mocks.retryEventUpdateBatchItem.mockResolvedValue({
    batchId: batch.id,
    itemId: 'item-1',
    eventId: 'event-1',
    sourceUrl: 'https://example.com/item-1',
    targetYear: 2027,
  });
  mocks.resumeEventUpdateBatch.mockResolvedValue(14);
  mocks.crawlSite.mockResolvedValue({
    markdown: 'Nova edició 2027. Inscripcions 2027. Resultats 2026.',
    pageStats: { total: 1, successCount: 1, errorCount: 0 },
    usage: { totalCost: null },
    fallbackUsed: false,
  });
  mocks.extractEventDraftDataFromMarkdown.mockResolvedValue({
      event: {
        name: 'Trail Event',
        description: 'Event description',
        websiteUrl: 'https://example.com/event',
      },
      races: [
        {
          name: 'Trail Event - 21K',
          date: '2027-05-01',
          city: 'Barcelona',
          province: 'Barcelona',
          distanceKm: 21,
          elevationGainM: 900,
        },
      ],
  });
});

describe('startEventUpdateBatch', () => {
  it('returns no workflow run when no candidate batch is created', async () => {
    mocks.createEventUpdateBatch.mockResolvedValue(null);

    const result = await startEventUpdateBatch({
      referenceDate: '2026-06-25',
    });

    expect(result).toEqual({ batchId: null, workflowRunId: null });
    expect(mocks.createEventUpdateBatch).toHaveBeenCalledWith({
      referenceDate: '2026-06-25',
    });
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it('starts the workflow and stores the workflow run id', async () => {
    const result = await startEventUpdateBatch({
      referenceDate: '2026-06-25',
    });

    expect(mocks.start).toHaveBeenCalledWith(eventUpdateBatchWorkflow, [
      { batchId: batch.id },
    ]);
    expect(mocks.setEventUpdateBatchWorkflowRunId).toHaveBeenCalledWith({
      batchId: batch.id,
      workflowRunId: 'workflow-run-1',
    });
    expect(result).toEqual({
      batchId: batch.id,
      workflowRunId: 'workflow-run-1',
    });
  });

  it('marks the batch failed when workflow start fails', async () => {
    const error = new Error('workflow start failed');
    mocks.start.mockRejectedValue(error);

    await expect(
      startEventUpdateBatch({ referenceDate: '2026-06-25' }),
    ).rejects.toThrow(error);

    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenCalledWith(
      { batchId: batch.id, status: 'failed', failureReason: 'Unable to start workflow' },
    );
  });

  it('marks the batch failed when workflow run id persistence fails', async () => {
    const error = new Error('workflow run id persistence failed');
    mocks.setEventUpdateBatchWorkflowRunId.mockRejectedValue(error);

    await expect(
      startEventUpdateBatch({ referenceDate: '2026-06-25' }),
    ).rejects.toThrow(error);

    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenCalledWith(
      { batchId: batch.id, status: 'failed', failureReason: 'Unable to start workflow' },
    );
  });
});

describe('resumeEventUpdateBatch', () => {
  it('resumes unfinished items in a new workflow run', async () => {
    const result = await resumeEventUpdateBatch(batch.id);

    expect(mocks.resumeEventUpdateBatch).toHaveBeenCalledWith(batch.id);
    expect(mocks.start).toHaveBeenCalledWith(eventUpdateBatchWorkflow, [{ batchId: batch.id }]);
    expect(mocks.setEventUpdateBatchWorkflowRunId).toHaveBeenCalledWith({
      batchId: batch.id,
      workflowRunId: 'workflow-run-1',
    });
    expect(result).toEqual({
      batchId: batch.id,
      workflowRunId: 'workflow-run-1',
      itemCount: 14,
    });
  });

  it('marks the batch failed when scheduling the recovery fails', async () => {
    const error = new Error('workflow start failed');
    mocks.start.mockRejectedValue(error);

    await expect(resumeEventUpdateBatch(batch.id)).rejects.toThrow(error);

    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenCalledWith({
      batchId: batch.id,
      status: 'failed',
      failureReason: 'Unable to resume workflow',
    });
  });
});

describe('eventUpdateBatchWorkflow', () => {
  it('crawls, generates drafts, and completes eligible pending items', async () => {
    const firstItem = item('1');
    const secondItem = item('2');
    mocks.getPendingEventUpdateBatchItems.mockResolvedValue([
      firstItem,
      secondItem,
    ]);

    await eventUpdateBatchWorkflow({ batchId: batch.id });

    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenNthCalledWith(
      1,
      { batchId: batch.id, status: 'running' },
    );
    expect(mocks.markEventUpdateItemRunning).toHaveBeenNthCalledWith(
      1,
      firstItem.id,
    );
    expect(mocks.completeEventUpdateItemWithDraft).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ itemId: firstItem.id }),
    );
    expect(mocks.markEventUpdateItemRunning).toHaveBeenNthCalledWith(
      2,
      secondItem.id,
    );
    expect(mocks.completeEventUpdateItemWithDraft).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ itemId: secondItem.id }),
    );
    expect(mocks.crawlSite).toHaveBeenNthCalledWith(1, firstItem.sourceUrl);
    expect(mocks.crawlSite).toHaveBeenNthCalledWith(2, secondItem.sourceUrl);
    expect(mocks.extractEventDraftDataFromMarkdown).toHaveBeenNthCalledWith(1, {
      markdown: 'Nova edició 2027. Inscripcions 2027. Resultats 2026.',
    });
    expect(mocks.extractEventDraftDataFromMarkdown).toHaveBeenNthCalledWith(2, {
      markdown: 'Nova edició 2027. Inscripcions 2027. Resultats 2026.',
    });
    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenLastCalledWith(
      { batchId: batch.id, status: 'completed' },
    );
  });

  it('completes skipped items with a weak signal reason', async () => {
    const skippedItem = item('1');
    mocks.getPendingEventUpdateBatchItems.mockResolvedValue([skippedItem]);
    mocks.crawlSite.mockResolvedValue({
      markdown: 'Resultats 2026. Classificacions 2026.',
      pageStats: { total: 1, successCount: 1, errorCount: 0 },
      usage: { totalCost: null },
      fallbackUsed: false,
    });

    await eventUpdateBatchWorkflow({ batchId: batch.id });

    expect(mocks.markEventUpdateItemRunning).toHaveBeenCalledWith(
      skippedItem.id,
    );
    expect(mocks.markEventUpdateItemSkipped).toHaveBeenCalledWith(
      skippedItem.id,
      'weak year signal: 2027=0, 2026=2',
    );
    expect(mocks.extractEventDraftDataFromMarkdown).not.toHaveBeenCalled();
    expect(mocks.markEventUpdateItemFailed).not.toHaveBeenCalled();
  });

  it('completes expected no-draft validation outcomes with a skip reason', async () => {
    const noDraftItem = item('1');
    mocks.getPendingEventUpdateBatchItems.mockResolvedValue([noDraftItem]);
    mocks.extractEventDraftDataFromMarkdown.mockRejectedValue(
      new ValidationError('No new edition data found', 422),
    );

    await eventUpdateBatchWorkflow({ batchId: batch.id });

    expect(mocks.extractEventDraftDataFromMarkdown).toHaveBeenCalledWith({
      markdown: 'Nova edició 2027. Inscripcions 2027. Resultats 2026.',
    });
    expect(mocks.markEventUpdateItemSkipped).toHaveBeenCalledWith(
      noDraftItem.id,
      'No new edition data found',
    );
    expect(mocks.markEventUpdateItemFailed).not.toHaveBeenCalled();
  });

  it('marks an item failed when draft generation fails unexpectedly', async () => {
    const failedItem = item('1');
    mocks.getPendingEventUpdateBatchItems.mockResolvedValue([failedItem]);
    mocks.extractEventDraftDataFromMarkdown.mockRejectedValue(
      new Error('OpenRouter unavailable'),
    );

    await eventUpdateBatchWorkflow({ batchId: batch.id });

    expect(mocks.markEventUpdateItemFailed).toHaveBeenCalledWith(
      failedItem.id,
      'OpenRouter unavailable',
    );
    expect(mocks.completeEventUpdateItemWithDraft).not.toHaveBeenCalled();
    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenLastCalledWith(
      { batchId: batch.id, status: 'completed' },
    );
  });

  it('marks an item failed when crawling fails', async () => {
    const failedItem = item('1');
    mocks.getPendingEventUpdateBatchItems.mockResolvedValue([failedItem]);
    mocks.crawlSite.mockRejectedValue(new Error('Spider Cloud timeout'));

    await eventUpdateBatchWorkflow({ batchId: batch.id });

    expect(mocks.markEventUpdateItemRunning).toHaveBeenCalledWith(
      failedItem.id,
    );
    expect(mocks.markEventUpdateItemFailed).toHaveBeenCalledWith(
      failedItem.id,
      'Spider Cloud timeout',
    );
    expect(mocks.completeEventUpdateItemWithDraft).not.toHaveBeenCalled();
    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenLastCalledWith(
      { batchId: batch.id, status: 'completed' },
    );
  });

  it('marks the batch failed when the workflow shell fails', async () => {
    const error = new Error('missing batch');
    mocks.getEventUpdateBatch.mockRejectedValue(error);

    await expect(eventUpdateBatchWorkflow({ batchId: batch.id })).rejects.toThrow(
      error,
    );

    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenNthCalledWith(
      1,
      { batchId: batch.id, status: 'running' },
    );
    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenLastCalledWith(
      { batchId: batch.id, status: 'failed', failureReason: 'Workflow did not finish' },
    );
  });
});

describe('retryEventUpdateBatchItem', () => {
  it('starts an item-only workflow and stores its run id', async () => {
    const result = await retryEventUpdateBatchItem({
      batchId: batch.id,
      itemId: 'item-1',
    });

    expect(mocks.start).toHaveBeenCalledWith(eventUpdateItemRetryWorkflow, [{
      batchId: batch.id,
      itemId: 'item-1',
      eventId: 'event-1',
      sourceUrl: 'https://example.com/item-1',
      targetYear: 2027,
    }]);
    expect(mocks.setEventUpdateItemAttemptWorkflowRunId).toHaveBeenCalledWith({
      itemId: 'item-1',
      workflowRunId: 'workflow-run-1',
    });
    expect(result).toEqual({
      batchId: batch.id,
      itemId: 'item-1',
      workflowRunId: 'workflow-run-1',
    });
  });

  it('marks the requeued item failed when scheduling fails', async () => {
    const error = new Error('workflow start failed');
    mocks.start.mockRejectedValue(error);

    await expect(retryEventUpdateBatchItem({
      batchId: batch.id,
      itemId: 'item-1',
    })).rejects.toThrow(error);

    expect(mocks.failPendingEventUpdateItemAttempt).toHaveBeenCalledWith({
      itemId: 'item-1',
      errorMessage: 'Unable to start retry workflow',
    });
  });

  it('returns 404 before retrying an item from a missing batch', async () => {
    mocks.getEventUpdateBatch.mockResolvedValue(null);

    await expect(retryEventUpdateBatchItem({
      batchId: batch.id,
      itemId: 'item-1',
    })).rejects.toEqual(new ValidationError('Event update batch not found', 404));

    expect(mocks.retryEventUpdateBatchItem).not.toHaveBeenCalled();
  });

  it('processes a retry without changing the batch lifecycle', async () => {
    await eventUpdateItemRetryWorkflow({
      itemId: 'item-1',
      eventId: 'event-1',
      sourceUrl: 'https://example.com/item-1',
      targetYear: 2027,
    });

    expect(mocks.markEventUpdateItemRunning).toHaveBeenCalledWith('item-1');
    expect(mocks.updateEventUpdateBatchStatus).not.toHaveBeenCalled();
  });
});
