import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  startBatch: vi.fn(),
  listHistory: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-research-batch', () => ({
  startEventResearchBatch: mocks.startBatch,
  listEventResearchBatchHistory: mocks.listHistory,
}));

import { GET, POST } from './route';

function request(eventNames: unknown): Request {
  return new Request('http://localhost/api/events/research/batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventNames }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('POST /api/events/research/batches', () => {
  it('requires an admin before starting work', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());
    const response = await POST(request(['XIV Solana Trail']));
    expect(response.status).toBe(401);
    expect(mocks.startBatch).not.toHaveBeenCalled();
  });

  it('validates and deduplicates input', async () => {
    mocks.startBatch.mockResolvedValue({ batchId: 'batch-1', workflowRunId: 'run-1' });
    const response = await POST(
      request([' XIV Solana Trail ', 'xiv solana trail', 'Trail Navajas']),
    );
    expect(response.status).toBe(201);
    expect(mocks.startBatch).toHaveBeenCalledWith([
      'XIV Solana Trail',
      'Trail Navajas',
    ]);
  });

  it('rejects invalid input without starting a workflow', async () => {
    const response = await POST(request([]));
    expect(response.status).toBe(400);
    expect(mocks.startBatch).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/events/research/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid request body',
    });
    expect(mocks.startBatch).not.toHaveBeenCalled();
  });
});

describe('GET /api/events/research/batches', () => {
  it('requires an admin before returning history', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.listHistory).not.toHaveBeenCalled();
  });

  it('returns persisted batch summaries', async () => {
    const history = [{
      batch: { id: 'batch-1', status: 'completed' },
      summary: { total: 2, pending: 0, running: 0, completed: 2, failed: 0 },
    }];
    mocks.listHistory.mockResolvedValue(history);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: history });
  });
});
