import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));

import { getPendingEvents } from './pending-events';

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
