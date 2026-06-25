import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  startEventUpdateBatch: vi.fn(),
}));

vi.mock('@/lib/services/event-update-batch', () => ({
  startEventUpdateBatch: mocks.startEventUpdateBatch,
}));

import { GET } from './route';

const originalCronSecret = process.env.CRON_SECRET;

function request(secret?: string): NextRequest {
  return new Request('http://localhost/api/cron/event-updates', {
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
