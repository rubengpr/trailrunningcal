import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  startEventUpdateBatch: vi.fn(),
  resumeEventUpdateBatch: vi.fn(),
}));

vi.mock('@/lib/services/event-update-batch', () => ({
  startEventUpdateBatch: mocks.startEventUpdateBatch,
  resumeEventUpdateBatch: mocks.resumeEventUpdateBatch,
}));

import { GET } from './route';

const originalCronSecret = process.env.CRON_SECRET;

function request(secret?: string, batchId?: string): NextRequest {
  const url = batchId
    ? `http://localhost/api/cron/event-updates?batchId=${batchId}`
    : 'http://localhost/api/cron/event-updates';
  return new Request(url, {
    method: 'GET',
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.CRON_SECRET = 'test-cron-secret';
  mocks.startEventUpdateBatch.mockResolvedValue({
    batchId: 'batch-1',
    workflowRunId: 'workflow-run-1',
  });
  mocks.resumeEventUpdateBatch.mockResolvedValue({
    batchId: '8e40792f-1a1a-4d30-8d15-ec70a12a04d5',
    workflowRunId: 'workflow-run-2',
    itemCount: 14,
  });
});

afterEach(() => {
  process.env.CRON_SECRET = originalCronSecret;
});

describe('GET /api/cron/event-updates', () => {
  it('rejects missing cron authorization', async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(mocks.startEventUpdateBatch).not.toHaveBeenCalled();
  });

  it('rejects invalid cron authorization', async () => {
    const response = await GET(request('wrong-secret'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(mocks.startEventUpdateBatch).not.toHaveBeenCalled();
  });

  it('starts the event update batch with valid cron authorization', async () => {
    const response = await GET(request('test-cron-secret'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        batchId: 'batch-1',
        workflowRunId: 'workflow-run-1',
      },
    });
    expect(mocks.startEventUpdateBatch).toHaveBeenCalledOnce();
  });

  it('resumes a failed batch when its id is supplied', async () => {
    const batchId = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
    const response = await GET(request('test-cron-secret', batchId));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        batchId,
        workflowRunId: 'workflow-run-2',
        itemCount: 14,
      },
    });
    expect(mocks.resumeEventUpdateBatch).toHaveBeenCalledWith(batchId);
    expect(mocks.startEventUpdateBatch).not.toHaveBeenCalled();
  });

  it('rejects an invalid batch id', async () => {
    const response = await GET(request('test-cron-secret', 'bad-id'));

    expect(response.status).toBe(400);
    expect(mocks.resumeEventUpdateBatch).not.toHaveBeenCalled();
  });

  it('returns the standard internal error shape on service errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.startEventUpdateBatch.mockRejectedValue(new Error('service failed'));

    const response = await GET(request('test-cron-secret'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });
  });
});
