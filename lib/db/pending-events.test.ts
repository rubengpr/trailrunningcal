import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

import { enqueuePendingEvents, getPendingEvents } from './pending-events';

beforeEach(() => {
  vi.resetAllMocks();

  const query = {
    select: mocks.select,
    eq: mocks.eq,
    order: mocks.order,
  };
  mocks.from.mockReturnValue(query);
  mocks.select.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
});

describe('getPendingEvents', () => {
  it('filters pending rows in the database before ordering them', async () => {
    mocks.order.mockResolvedValue({
      data: [
        {
          id: 'pending-1',
          url: 'https://example.com/race',
          status: 'pending',
          created_at: '2026-08-08T10:00:00.000Z',
          updated_at: '2026-08-08T10:00:00.000Z',
        },
      ],
      error: null,
    });

    await expect(getPendingEvents()).resolves.toEqual([
      {
        id: 'pending-1',
        url: 'https://example.com/race',
        status: 'pending',
        createdAt: '2026-08-08T10:00:00.000Z',
        updatedAt: '2026-08-08T10:00:00.000Z',
      },
    ]);
    expect(mocks.from).toHaveBeenCalledWith('pending_events');
    expect(mocks.eq).toHaveBeenCalledWith('status', 'pending');
    expect(mocks.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
  });
});

describe('enqueuePendingEvents', () => {
  it('delegates the whole queue operation to one atomic RPC', async () => {
    const added = [{
      id: 'pending-1',
      url: 'https://example.com/new',
      status: 'pending',
      createdAt: '2026-09-10T20:00:00.000Z',
      updatedAt: '2026-09-10T20:00:00.000Z',
    }];
    const skipped = [{
      url: 'https://example.com/existing',
      reason: 'alreadyInEvents',
    }];
    mocks.rpc.mockResolvedValue({ data: { added, skipped }, error: null });

    await expect(enqueuePendingEvents([
      'https://example.com/new',
      'https://example.com/existing',
    ])).resolves.toEqual({ added, skipped });

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith('enqueue_pending_events', {
      p_urls: [
        'https://example.com/new',
        'https://example.com/existing',
      ],
    });
  });

  it('propagates transaction failures instead of returning a partial result', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'failed' } });

    await expect(enqueuePendingEvents(['https://example.com/new'])).rejects.toThrow(
      'Failed to enqueue pending events',
    );
  });
});
