import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENT_DESCRIPTION_CONCURRENCY } from '@/lib/event-description/config';

const mocks = vi.hoisted(() => ({
  generateEventDescriptionDraft: vi.fn(),
  getEventDescriptionBatch: vi.fn(),
  getPendingEventDescriptionItems: vi.fn(),
  markEventDescriptionItemCompleted: vi.fn(),
  markEventDescriptionItemRunning: vi.fn(),
  updateEventDescriptionBatchStatus: vi.fn(),
}));

vi.mock('workflow/api', () => ({ start: vi.fn() }));
vi.mock('@/lib/db/event-description-batches', () => ({
  createEventDescriptionBatch: vi.fn(),
  getEventDescriptionBatch: mocks.getEventDescriptionBatch,
  getEventDescriptionBatchSnapshotData: vi.fn(),
  getPendingEventDescriptionItems: mocks.getPendingEventDescriptionItems,
  markEventDescriptionItemCompleted: mocks.markEventDescriptionItemCompleted,
  markEventDescriptionItemFailed: vi.fn(),
  markEventDescriptionItemRunning: mocks.markEventDescriptionItemRunning,
  setEventDescriptionBatchWorkflowRunId: vi.fn(),
  updateEventDescriptionBatchStatus: mocks.updateEventDescriptionBatchStatus,
}));
vi.mock('@/lib/services/event-description', () => ({
  generateEventDescriptionDraft: mocks.generateEventDescriptionDraft,
}));

import { eventDescriptionBatchWorkflow } from './event-description-batch';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('eventDescriptionBatchWorkflow', () => {
  it('processes items with bounded concurrency', async () => {
    const itemCount = EVENT_DESCRIPTION_CONCURRENCY * 2 + 1;
    mocks.getEventDescriptionBatch.mockResolvedValue({
      id: 'batch-1',
      model: 'openai/gpt-5.4-mini',
    });
    mocks.getPendingEventDescriptionItems.mockResolvedValue(
      Array.from({ length: itemCount }, (_, index) => ({
        id: `item-${index}`,
        eventId: `event-${index}`,
      })),
    );

    let active = 0;
    let maximumActive = 0;
    mocks.generateEventDescriptionDraft.mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      return { errorMessage: null };
    });

    await eventDescriptionBatchWorkflow({ batchId: 'batch-1' });

    expect(maximumActive).toBe(EVENT_DESCRIPTION_CONCURRENCY);
    expect(mocks.generateEventDescriptionDraft).toHaveBeenCalledTimes(itemCount);
    expect(mocks.updateEventDescriptionBatchStatus).toHaveBeenNthCalledWith(
      1,
      'batch-1',
      'running',
    );
    expect(mocks.updateEventDescriptionBatchStatus).toHaveBeenLastCalledWith(
      'batch-1',
      'completed',
    );
  });
});
