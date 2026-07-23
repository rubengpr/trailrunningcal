import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventImportResult } from '@/types/events-import-api.types';

const mocks = vi.hoisted(() => ({
  acceptItem: vi.fn(),
  getItemResultState: vi.fn(),
  saveItemResult: vi.fn(),
}));

vi.mock('workflow/api', () => ({ start: vi.fn() }));
vi.mock('@/lib/guards/duplicate-events', () => ({
  checkDuplicateEvents: vi.fn(),
}));
vi.mock('@/lib/services/event-import', () => ({
  processCrawlSiteExtract: vi.fn(),
}));
vi.mock('@/lib/db/event-import-batches', () => ({
  createEventImportBatch: vi.fn(),
  acceptItem: mocks.acceptItem,
  getBatchSnapshotData: vi.fn(),
  getPendingBatchItems: vi.fn(),
  getEventImportBatch: vi.fn(),
  getItemResultState: mocks.getItemResultState,
  markBatchItemCompleted: vi.fn(),
  markBatchItemFailed: vi.fn(),
  markBatchItemRunning: vi.fn(),
  saveItemResult: mocks.saveItemResult,
  setBatchWorkflowRunId: vi.fn(),
  updateBatchStatus: vi.fn(),
}));

import { acceptItem, updateItemResult } from './event-import-batch';

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
});
