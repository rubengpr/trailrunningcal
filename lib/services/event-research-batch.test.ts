import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EventResearchBatch,
  EventResearchBatchItem,
  EventResearchRunResult,
} from '@/types/event-research.types';
import type { TrailEventAgentParsed } from '@/types/trail-event-agent.types';

const mocks = vi.hoisted(() => ({
  completeItem: vi.fn(),
  createBatch: vi.fn(),
  failItem: vi.fn(),
  getBatch: vi.fn(),
  listBatches: vi.fn(),
  getItem: vi.fn(),
  getItems: vi.fn(),
  researchEvent: vi.fn(),
  retryItem: vi.fn(),
  setWorkflowRunId: vi.fn(),
  startItem: vi.fn(),
  startWorkflow: vi.fn(),
  updateBatchStatus: vi.fn(),
}));

vi.mock('workflow/api', () => ({ start: mocks.startWorkflow }));
vi.mock('@/lib/db/event-research-batches', () => ({
  completeEventResearchItem: mocks.completeItem,
  createEventResearchBatch: mocks.createBatch,
  failEventResearchItem: mocks.failItem,
  getEventResearchBatch: mocks.getBatch,
  listEventResearchBatches: mocks.listBatches,
  getEventResearchItem: mocks.getItem,
  getEventResearchItems: mocks.getItems,
  retryEventResearchItem: mocks.retryItem,
  setEventResearchWorkflowRunId: mocks.setWorkflowRunId,
  startEventResearchItem: mocks.startItem,
  updateEventResearchBatchStatus: mocks.updateBatchStatus,
}));
vi.mock('@/lib/integrations/openai/event-research', () => ({
  researchEvent: mocks.researchEvent,
}));

import {
  eventResearchBatchWorkflow,
  listEventResearchBatchHistory,
  retryEventResearchItem,
} from './event-research-batch';

const batch: EventResearchBatch = {
  id: 'batch-1',
  status: 'pending',
  model: 'gpt-5.6-terra',
  promptSlug: 'event-research-v0',
  promptVersion: 'version-1',
  searchContextSize: 'high',
  concurrency: 4,
  workflowRunId: null,
  createdAt: '2026-08-22T00:00:00.000Z',
  updatedAt: '2026-08-22T00:00:00.000Z',
};

function item(index: number): EventResearchBatchItem {
  return {
    id: `item-${index}`,
    batchId: batch.id,
    eventName: `Event ${index}`,
    status: 'pending',
    result: null,
    sources: [],
    usage: null,
    openAIResponseId: null,
    braintrustRootSpanId: null,
    raceCount: null,
    attemptCount: 0,
    error: null,
    draftId: null,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

const validResult: TrailEventAgentParsed = {
  event: {
    name: 'XIV Solana Trail',
    description: null,
    websiteUrl: 'https://example.com/solana',
  },
  races: [
    {
      name: null,
      date: '2026-01-01',
      city: 'Beneixama',
      province: 'Valencia',
      distanceKm: 15,
      elevationGainM: 600,
      gpxDownloadUrl: null,
      tiers: [],
    },
  ],
  errorMessage: null,
};

function successfulRun(result = validResult): EventResearchRunResult {
  return {
    result,
    failure: null,
    braintrustRootSpanId: 'root-span',
    response: {
      id: 'response-1',
      model: batch.model,
      status: 'completed',
      searchCallCount: 1,
      sources: ['https://example.com/source'],
      usage: {
        inputTokens: 10,
        cachedInputTokens: 0,
        outputTokens: 20,
        reasoningTokens: 5,
        totalTokens: 30,
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getBatch.mockResolvedValue(batch);
  mocks.startItem.mockResolvedValue(true);
  mocks.completeItem.mockResolvedValue('draft-1');
});

describe('eventResearchBatchWorkflow', () => {
  it('bounds concurrency at four and automatically creates eligible drafts', async () => {
    const items = Array.from({ length: 6 }, (_, index) => item(index));
    mocks.getItems.mockResolvedValue(items);
    let active = 0;
    let maximum = 0;
    mocks.researchEvent.mockImplementation(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return successfulRun();
    });

    await eventResearchBatchWorkflow({ batchId: batch.id });

    expect(maximum).toBe(4);
    expect(mocks.completeItem).toHaveBeenCalledTimes(6);
    expect(mocks.completeItem).toHaveBeenCalledWith(
      expect.objectContaining({
        draftData: expect.objectContaining({ event: validResult.event }),
        raceCount: 1,
      }),
    );
    expect(mocks.updateBatchStatus).toHaveBeenLastCalledWith(
      batch.id,
      'completed',
    );
  });

  it('isolates technical failures and completes negative cases without drafts', async () => {
    mocks.getItems.mockResolvedValue([item(1), item(2)]);
    mocks.researchEvent
      .mockResolvedValueOnce({
        result: null,
        failure: 'timeout',
        response: null,
        braintrustRootSpanId: 'timeout-span',
      } satisfies EventResearchRunResult)
      .mockResolvedValueOnce(
        successfulRun({
          event: null,
          races: [],
          errorMessage: 'No se ha encontrado el evento.',
        }),
      );

    await eventResearchBatchWorkflow({ batchId: batch.id });

    expect(mocks.failItem).toHaveBeenCalledWith({
      itemId: 'item-1',
      error: 'timeout',
      braintrustRootSpanId: 'timeout-span',
    });
    expect(mocks.completeItem).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'item-2',
        raceCount: 0,
        draftData: undefined,
      }),
    );
    expect(mocks.updateBatchStatus).toHaveBeenLastCalledWith(
      batch.id,
      'completed',
    );
  });

  it('persists the workflow run id when retrying a failed item', async () => {
    mocks.getItem.mockResolvedValue({
      ...item(1),
      status: 'failed',
      error: 'timeout',
    });
    mocks.retryItem.mockResolvedValue({
      batchId: batch.id,
      itemId: 'item-1',
      eventName: 'Event 1',
    });
    mocks.startWorkflow.mockResolvedValue({ runId: 'retry-run-1' });

    await expect(retryEventResearchItem('item-1')).resolves.toEqual({
      batchId: batch.id,
      itemId: 'item-1',
      workflowRunId: 'retry-run-1',
    });
    expect(mocks.setWorkflowRunId).toHaveBeenCalledWith({
      batchId: batch.id,
      workflowRunId: 'retry-run-1',
    });
  });
});

describe('listEventResearchBatchHistory', () => {
  it('returns each persisted batch with its item status summary', async () => {
    const older = { ...batch, id: 'batch-older' };
    mocks.listBatches.mockResolvedValue([batch, older]);
    mocks.getItems
      .mockResolvedValueOnce([
        { ...item(1), status: 'completed' },
        { ...item(2), status: 'failed', error: 'timeout' },
      ])
      .mockResolvedValueOnce([item(3)]);

    await expect(listEventResearchBatchHistory()).resolves.toEqual([
      {
        batch,
        summary: { total: 2, pending: 0, running: 0, completed: 1, failed: 1 },
      },
      {
        batch: older,
        summary: { total: 1, pending: 1, running: 0, completed: 0, failed: 0 },
      },
    ]);
    expect(mocks.listBatches).toHaveBeenCalledWith();
  });
});
