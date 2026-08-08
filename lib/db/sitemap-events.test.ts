import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: () => ({ from: mocks.from }),
}));

import { getSitemapEvents } from './sitemap-events';

function row(index: number) {
  return {
    slug: `event-${String(index).padStart(4, '0')}`,
    updated_at: '2026-08-08T10:00:00.000Z',
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: mocks.select,
    order: mocks.order,
    range: mocks.range,
  };
  mocks.from.mockReturnValue(query);
  mocks.select.mockReturnValue(query);
  mocks.order.mockReturnValue(query);
});

describe('getSitemapEvents', () => {
  it('fetches every event in ordered 1,000-row pages', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => row(index));
    mocks.range
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [row(1000)], error: null });

    const events = await getSitemapEvents();

    expect(events).toHaveLength(1001);
    expect(events[0]).toEqual({
      slug: 'event-0000',
      updatedAt: '2026-08-08T10:00:00.000Z',
    });
    expect(mocks.select).toHaveBeenCalledWith('slug, updated_at');
    expect(mocks.order).toHaveBeenCalledWith('slug', { ascending: true });
    expect(mocks.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(mocks.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('fails the sitemap build rather than returning partial data', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.range.mockResolvedValue({
      data: null,
      error: { message: 'failed' },
    });

    await expect(getSitemapEvents()).rejects.toThrow(
      'Failed to fetch sitemap events',
    );
  });
});
