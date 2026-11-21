import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFavoriteEvents } from './events';

const ids = Array.from({ length: 101 }, (_, index) =>
  `123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`,
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getFavoriteEvents', () => {
  it('loads saved IDs in batches of up to 100 and keeps their order', async () => {
    const fetch = vi.fn((_url: string, init: RequestInit) => {
      const { eventIds } = JSON.parse(String(init.body)) as { eventIds: string[] };
      return Response.json({
        success: true,
        data: eventIds.map((id) => ({ event: { id } })),
      });
    });
    vi.stubGlobal('fetch', fetch);

    const events = await getFavoriteEvents([...ids, ids[0]]);

    expect(events.map(({ event }) => event.id)).toEqual(ids);
    expect(fetch.mock.calls.map(([, { body }]) => JSON.parse(String(body)))).toEqual([
      { eventIds: ids.slice(0, 100) },
      { eventIds: ids.slice(100) },
    ]);
  });

  it('rejects the load if a later batch fails', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ success: true, data: [] }))
      .mockResolvedValueOnce(Response.json({ error: 'Internal server error' }, { status: 500 }));
    vi.stubGlobal('fetch', fetch);

    await expect(getFavoriteEvents(ids)).rejects.toThrow('Internal server error');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
