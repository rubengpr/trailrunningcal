import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventImportResult } from '@/types/events-import-api.types';

const mocks = vi.hoisted(() => ({
  acceptItem: vi.fn(),
  getEventImportBatch: vi.fn(),
  getItemResultState: vi.fn(),
  getPendingBatchItems: vi.fn(),
  markBatchItemCompleted: vi.fn(),
  markBatchItemRunning: vi.fn(),
  processCrawlSiteExtract: vi.fn(),
  saveItemResult: vi.fn(),
  updateBatchStatus: vi.fn(),
}));

vi.mock('workflow/api', () => ({ start: vi.fn() }));
vi.mock('@/lib/guards/duplicate-events', () => ({
  checkDuplicateEvents: vi.fn(),
}));
vi.mock('@/lib/services/event-import', () => ({
  processCrawlSiteExtract: mocks.processCrawlSiteExtract,
}));
vi.mock('@/lib/db/event-import-batches', () => ({
  createEventImportBatch: vi.fn(),
  acceptItem: mocks.acceptItem,
  getBatchSnapshotData: vi.fn(),
  getPendingBatchItems: mocks.getPendingBatchItems,
  getEventImportBatch: mocks.getEventImportBatch,
  getItemResultState: mocks.getItemResultState,
  markBatchItemCompleted: mocks.markBatchItemCompleted,
  markBatchItemFailed: vi.fn(),
  markBatchItemRunning: mocks.markBatchItemRunning,
  saveItemResult: mocks.saveItemResult,
  setBatchWorkflowRunId: vi.fn(),
  updateBatchStatus: mocks.updateBatchStatus,
}));

import {
  acceptItem,
  eventImportBatchWorkflow,
  updateItemResult,
} from './event-import-batch';
import { EVENT_IMPORT_CONCURRENCY } from '@/lib/event-import/config';

const ITEM_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const original: EventImportResult = {
  workflow: 'crawlSiteExtract',
  url: 'https://example.com/event',
  event: {
    name: 'Original Event',
    description: 'Original description',
    websiteUrl: 'https://example.com/event',
  },
  races: [
    {
      name: 'Original 10K',
      date: '2027-05-01',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 10,
      elevationGainM: 400,
      tiers: [],
    },
  ],
  errorMessage: 'Provider warning retained for review',
  markdown: '# Original crawl',
  rawModelOutput: '{"original":true}',
  usage: {
    promptTokens: 100,
    completionTokens: 20,
    totalTokens: 120,
    reasoningTokens: 5,
    cost: 0.01,
  },
  pageStats: { total: 3, successCount: 2, errorCount: 1 },
  scrapeUsage: { totalCost: 0.02 },
  fallbackUsed: true,
  steps: [
    {
      name: 'crawlSite',
      status: 'success',
      durationMs: 1200,
      pageStats: { total: 3, successCount: 2, errorCount: 1 },
    },
  ],
};

const edited = {
  event: {
    name: 'Edited Event',
    description: 'Edited description',
    websiteUrl: 'https://example.com/edited',
  },
  races: [
    {
      name: 'Edited 21K',
      date: '2027-05-02',
      city: 'Girona',
      province: 'Girona',
      distanceKm: 21,
      elevationGainM: 900,
      tiers: [{ priceEur: 30, endsAt: null }],
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('updateItemResult', () => {
  it('replaces review fields while preserving all extraction metadata', async () => {
    const persisted = { ...original, ...edited };
    mocks.getItemResultState.mockResolvedValue({
      result: original,
      reviewStatus: 'pending',
    });
    mocks.saveItemResult.mockResolvedValue(persisted);

    await expect(updateItemResult(ITEM_ID, edited)).resolves.toEqual(persisted);

    expect(mocks.saveItemResult).toHaveBeenCalledWith(ITEM_ID, persisted);
    expect(persisted).toMatchObject({
      workflow: original.workflow,
      url: original.url,
      errorMessage: original.errorMessage,
      markdown: original.markdown,
      rawModelOutput: original.rawModelOutput,
      usage: original.usage,
      pageStats: original.pageStats,
      scrapeUsage: original.scrapeUsage,
      fallbackUsed: original.fallbackUsed,
      steps: original.steps,
      event: edited.event,
      races: edited.races,
    });
  });

  it('returns 404 when there is no completed stored result', async () => {
    mocks.getItemResultState.mockResolvedValue(null);

    await expect(updateItemResult(ITEM_ID, edited)).rejects.toMatchObject({
      message: 'Item not found',
      status: 404,
    });
    expect(mocks.saveItemResult).not.toHaveBeenCalled();
  });

  it('returns 404 if the item stops matching before the update', async () => {
    mocks.getItemResultState.mockResolvedValue({
      result: original,
      reviewStatus: 'pending',
    });
    mocks.saveItemResult.mockResolvedValue(null);

    await expect(updateItemResult(ITEM_ID, edited)).rejects.toMatchObject({
      message: 'Item not found',
      status: 404,
    });
  });

  it('returns 409 when an accepted item is edited', async () => {
    mocks.getItemResultState.mockResolvedValue({
      result: original,
      reviewStatus: 'accepted',
    });

    await expect(updateItemResult(ITEM_ID, edited)).rejects.toMatchObject({
      message: 'Accepted items cannot be edited',
      status: 409,
    });
    expect(mocks.saveItemResult).not.toHaveBeenCalled();
  });

  it('returns 409 if acceptance wins a concurrent edit', async () => {
    mocks.getItemResultState
      .mockResolvedValueOnce({ result: original, reviewStatus: 'pending' })
      .mockResolvedValueOnce({ result: original, reviewStatus: 'accepted' });
    mocks.saveItemResult.mockResolvedValue(null);

    await expect(updateItemResult(ITEM_ID, edited)).rejects.toMatchObject({
      message: 'Accepted items cannot be edited',
      status: 409,
    });
  });
});

describe('acceptItem', () => {
  it('returns the public identity created by the atomic database operation', async () => {
    mocks.getItemResultState.mockResolvedValue({
      result: original,
      reviewStatus: 'pending',
    });
    mocks.acceptItem.mockResolvedValue({
      eventId: 'event-1',
      eventSlug: 'accepted-event',
    });

    await expect(acceptItem(ITEM_ID)).resolves.toEqual({
      eventId: 'event-1',
      eventSlug: 'accepted-event',
    });
    expect(mocks.acceptItem).toHaveBeenCalledWith(ITEM_ID);
  });

  it('rejects an invalid province stored in a completed batch item', async () => {
    mocks.getItemResultState.mockResolvedValue({
      result: {
        ...original,
        races: [{ ...original.races[0], province: 'Gerona' }],
      },
      reviewStatus: 'pending',
    });

    await expect(acceptItem(ITEM_ID)).rejects.toMatchObject({
      message: 'Invalid province',
      status: 400,
    });
    expect(mocks.acceptItem).not.toHaveBeenCalled();
  });
});

describe('eventImportBatchWorkflow', () => {
  it('processes items with bounded concurrency', async () => {
    const itemCount = EVENT_IMPORT_CONCURRENCY * 2 + 1;
    mocks.getEventImportBatch.mockResolvedValue({
      id: 'batch-1',
      model: 'openai/gpt-5.4-mini',
    });
    mocks.getPendingBatchItems.mockResolvedValue(
      Array.from({ length: itemCount }, (_, index) => ({
        id: `item-${index}`,
        url: `https://example.com/events/${index}`,
      })),
    );

    let active = 0;
    let maximumActive = 0;
    mocks.processCrawlSiteExtract.mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      return { races: [] };
    });

    await eventImportBatchWorkflow({ batchId: 'batch-1' });

    expect(maximumActive).toBe(EVENT_IMPORT_CONCURRENCY);
    expect(mocks.processCrawlSiteExtract).toHaveBeenCalledTimes(itemCount);
    expect(mocks.updateBatchStatus).toHaveBeenNthCalledWith(1, 'batch-1', 'running');
    expect(mocks.updateBatchStatus).toHaveBeenLastCalledWith('batch-1', 'completed');
  });
});
