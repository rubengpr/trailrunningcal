import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  retryItem: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-research-batch', () => ({
  retryEventResearchItem: mocks.retryItem,
}));

import { POST } from './route';

const ITEM_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const request = new Request(
  `http://localhost/api/events/research/batch-items/${ITEM_ID}/retry`,
  { method: 'POST' },
);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('POST /api/events/research/batch-items/[itemId]/retry', () => {
  it('returns 202 for a scheduled retry', async () => {
    const data = { batchId: 'batch-1', itemId: ITEM_ID, workflowRunId: 'run-1' };
    mocks.retryItem.mockResolvedValue(data);
    const response = await POST(request, { params: Promise.resolve({ itemId: ITEM_ID }) });
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, data });
  });

  it('returns 409 when the item is not failed', async () => {
    mocks.retryItem.mockRejectedValue(
      new ValidationError('Research item is not retryable', 409),
    );
    const response = await POST(request, { params: Promise.resolve({ itemId: ITEM_ID }) });
    expect(response.status).toBe(409);
  });

  it('rejects malformed ids', async () => {
    const response = await POST(request, { params: Promise.resolve({ itemId: 'bad-id' }) });
    expect(response.status).toBe(400);
    expect(mocks.retryItem).not.toHaveBeenCalled();
  });
});
