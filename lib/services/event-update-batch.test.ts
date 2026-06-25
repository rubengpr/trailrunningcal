import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  EventUpdateBatch,
  EventUpdateBatchItem,
} from '@/types/event-update.types';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  crawlSite: vi.fn(),
  createEventUpdateBatch: vi.fn(),
  getEventUpdateBatch: vi.fn(),
  getPendingEventUpdateBatchItems: vi.fn(),
  markEventUpdateItemCompleted: vi.fn(),
  markEventUpdateItemFailed: vi.fn(),
  markEventUpdateItemRunning: vi.fn(),
  setEventUpdateBatchWorkflowRunId: vi.fn(),
  updateEventUpdateBatchStatus: vi.fn(),
}));

vi.mock('workflow/api', () => ({
  start: mocks.start,
}));

vi.mock('@/lib/integrations/spider-cloud/service', () => ({
  crawlSite: mocks.crawlSite,
}));

vi.mock('@/lib/db/event-update-batches', () => ({
  createEventUpdateBatch: mocks.createEventUpdateBatch,
  getEventUpdateBatch: mocks.getEventUpdateBatch,
  getPendingEventUpdateBatchItems: mocks.getPendingEventUpdateBatchItems,
  markEventUpdateItemCompleted: mocks.markEventUpdateItemCompleted,
  markEventUpdateItemFailed: mocks.markEventUpdateItemFailed,
  markEventUpdateItemRunning: mocks.markEventUpdateItemRunning,
  setEventUpdateBatchWorkflowRunId: mocks.setEventUpdateBatchWorkflowRunId,
  updateEventUpdateBatchStatus: mocks.updateEventUpdateBatchStatus,
}));

import {
  eventUpdateBatchWorkflow,
  startEventUpdateBatch,
} from './event-update-batch';

const batch: EventUpdateBatch = {
  id: 'batch-1',
  status: 'pending',
  workflowRunId: null,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
};

const item = (id: string): EventUpdateBatchItem => ({
  id,
  batchId: batch.id,
  eventId: `event-${id}`,
  targetYear: 2027,
  sourceUrl: `https://example.com/${id}`,
  status: 'pending',
  error: null,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.start.mockResolvedValue({ runId: 'workflow-run-1' });
  mocks.createEventUpdateBatch.mockResolvedValue(batch);
  mocks.getEventUpdateBatch.mockResolvedValue(batch);
  mocks.getPendingEventUpdateBatchItems.mockResolvedValue([]);
  mocks.crawlSite.mockResolvedValue({
    markdown: 'Nova edició 2027. Inscripcions 2027. Resultats 2026.',
    pageStats: { total: 1, successCount: 1, errorCount: 0 },
    usage: { totalCost: null },
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
      batch.id,
      'failed',
    );
  });

  it('marks the batch failed when workflow run id persistence fails', async () => {
    const error = new Error('workflow run id persistence failed');
    mocks.setEventUpdateBatchWorkflowRunId.mockRejectedValue(error);

    await expect(
      startEventUpdateBatch({ referenceDate: '2026-06-25' }),
    ).rejects.toThrow(error);

    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenCalledWith(
      batch.id,
      'failed',
    );
  });
});

describe('eventUpdateBatchWorkflow', () => {
  it('crawls and completes eligible pending items', async () => {
    const firstItem = item('1');
    const secondItem = item('2');
    mocks.getPendingEventUpdateBatchItems.mockResolvedValue([
      firstItem,
      secondItem,
    ]);

    await eventUpdateBatchWorkflow({ batchId: batch.id });

    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenNthCalledWith(
      1,
      batch.id,
      'running',
    );
    expect(mocks.markEventUpdateItemRunning).toHaveBeenNthCalledWith(
      1,
      firstItem.id,
    );
    expect(mocks.markEventUpdateItemCompleted).toHaveBeenNthCalledWith(
      1,
      firstItem.id,
      { error: null },
    );
    expect(mocks.markEventUpdateItemRunning).toHaveBeenNthCalledWith(
      2,
      secondItem.id,
    );
    expect(mocks.markEventUpdateItemCompleted).toHaveBeenNthCalledWith(
      2,
      secondItem.id,
      { error: null },
    );
    expect(mocks.crawlSite).toHaveBeenNthCalledWith(1, firstItem.sourceUrl);
    expect(mocks.crawlSite).toHaveBeenNthCalledWith(2, secondItem.sourceUrl);
    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenLastCalledWith(
      batch.id,
      'completed',
    );
  });

  it('completes skipped items with a weak signal reason', async () => {
    const skippedItem = item('1');
    mocks.getPendingEventUpdateBatchItems.mockResolvedValue([skippedItem]);
    mocks.crawlSite.mockResolvedValue({
      markdown: 'Resultats 2026. Classificacions 2026.',
      pageStats: { total: 1, successCount: 1, errorCount: 0 },
      usage: { totalCost: null },
    });

    await eventUpdateBatchWorkflow({ batchId: batch.id });

    expect(mocks.markEventUpdateItemRunning).toHaveBeenCalledWith(
      skippedItem.id,
    );
    expect(mocks.markEventUpdateItemCompleted).toHaveBeenCalledWith(
      skippedItem.id,
      { error: 'Skipped: weak year signal: 2027=0, 2026=2' },
    );
    expect(mocks.markEventUpdateItemFailed).not.toHaveBeenCalled();
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
    expect(mocks.markEventUpdateItemCompleted).not.toHaveBeenCalled();
    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenLastCalledWith(
      batch.id,
      'completed',
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
      batch.id,
      'running',
    );
    expect(mocks.updateEventUpdateBatchStatus).toHaveBeenLastCalledWith(
      batch.id,
      'failed',
    );
  });
});
