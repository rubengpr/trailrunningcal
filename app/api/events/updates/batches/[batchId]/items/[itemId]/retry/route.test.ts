import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  retryItem: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-update-batch', () => ({
  retryEventUpdateBatchItem: mocks.retryItem,
}));

import { POST } from './route';

const BATCH_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const ITEM_ID = '6e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const request = new Request(
  `http://localhost/api/events/updates/batches/${BATCH_ID}/items/${ITEM_ID}/retry`,
  { method: 'POST' },
);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('POST /api/events/updates/batches/[batchId]/items/[itemId]/retry', () => {
  it('returns 202 for a scheduled retry', async () => {
    const data = { batchId: BATCH_ID, itemId: ITEM_ID, workflowRunId: 'run-1' };
    mocks.retryItem.mockResolvedValue(data);

    const response = await POST(request, {
      params: Promise.resolve({ batchId: BATCH_ID, itemId: ITEM_ID }),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, data });
  });

  it('returns 409 when the item is not retryable', async () => {
    mocks.retryItem.mockRejectedValue(
      new ValidationError('Event update item is not retryable', 409),
    );

    const response = await POST(request, {
      params: Promise.resolve({ batchId: BATCH_ID, itemId: ITEM_ID }),
    });

    expect(response.status).toBe(409);
  });

  it('returns 404 when the batch does not exist', async () => {
    mocks.retryItem.mockRejectedValue(
      new ValidationError('Event update batch not found', 404),
    );

    const response = await POST(request, {
      params: Promise.resolve({ batchId: BATCH_ID, itemId: ITEM_ID }),
    });

    expect(response.status).toBe(404);
  });

  it('rejects malformed ids before calling the service', async () => {
    const response = await POST(request, {
      params: Promise.resolve({ batchId: 'bad-id', itemId: ITEM_ID }),
    });

    expect(response.status).toBe(400);
    expect(mocks.retryItem).not.toHaveBeenCalled();
  });

  it('rejects a malformed item id before calling the service', async () => {
    const response = await POST(request, {
      params: Promise.resolve({ batchId: BATCH_ID, itemId: 'bad-id' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.retryItem).not.toHaveBeenCalled();
  });
});
