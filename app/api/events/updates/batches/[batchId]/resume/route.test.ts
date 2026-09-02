import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  resumeBatch: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-update-batch', () => ({
  resumeEventUpdateBatch: mocks.resumeBatch,
}));

import { POST } from './route';

const BATCH_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const request = new Request(
  `http://localhost/api/events/updates/batches/${BATCH_ID}/resume`,
  { method: 'POST' },
);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('POST /api/events/updates/batches/[batchId]/resume', () => {
  it('returns 202 for a scheduled recovery', async () => {
    const data = { batchId: BATCH_ID, workflowRunId: 'run-1', itemCount: 14 };
    mocks.resumeBatch.mockResolvedValue(data);

    const response = await POST(request, {
      params: Promise.resolve({ batchId: BATCH_ID }),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, data });
  });

  it('returns 409 when the batch cannot be resumed', async () => {
    mocks.resumeBatch.mockRejectedValue(
      new ValidationError('Event update batch is not resumable', 409),
    );

    const response = await POST(request, {
      params: Promise.resolve({ batchId: BATCH_ID }),
    });

    expect(response.status).toBe(409);
  });

  it('rejects malformed ids before calling the service', async () => {
    const response = await POST(request, {
      params: Promise.resolve({ batchId: 'bad-id' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.resumeBatch).not.toHaveBeenCalled();
  });
});
