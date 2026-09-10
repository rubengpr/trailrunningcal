import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  in: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ in: mocks.in }),
    }),
  }),
}));

import { getBatchSummaries } from './event-research-batches';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getBatchSummaries', () => {
  it('loads statuses for every batch in one query and groups the counts', async () => {
    mocks.in.mockResolvedValue({
      data: [
        { batch_id: 'batch-1', status: 'completed' },
        { batch_id: 'batch-1', status: 'failed' },
        { batch_id: 'batch-2', status: 'pending' },
      ],
      error: null,
    });

    const result = await getBatchSummaries(['batch-1', 'batch-2']);

    expect(mocks.in).toHaveBeenCalledWith('batch_id', ['batch-1', 'batch-2']);
    expect(result.get('batch-1')).toEqual({
      total: 2,
      pending: 0,
      running: 0,
      completed: 1,
      failed: 1,
    });
    expect(result.get('batch-2')).toEqual({
      total: 1,
      pending: 1,
      running: 0,
      completed: 0,
      failed: 0,
    });
  });
});
