import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ events: vi.fn(), races: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: () => ({
    from: (table: string) => ({
      select: () => ({ in: table === 'events' ? mocks.events : mocks.races }),
    }),
  }),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { POST } from './route';

const eventId = '11111111-1111-4111-8111-111111111111';
const event = { id: eventId, name: 'Trail Event', slug: 'trail-event' };

function request() {
  return new NextRequest('http://localhost/api/events/favorites', {
    method: 'POST',
    body: JSON.stringify({ eventIds: [eventId] }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.events.mockResolvedValue({ data: [event], error: null });
  mocks.races.mockResolvedValue({ data: [], error: null });
});

describe('POST /api/events/favorites', () => {
  it.each(['events', 'races'] as const)('returns a safe 500 when %s fail', async (table) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks[table].mockResolvedValue({ data: null, error: { message: 'internal database detail' } });

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
  });

  it('returns an empty success for missing favorites', async () => {
    mocks.events.mockResolvedValue({ data: [], error: null });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: [] });
    expect(mocks.races).not.toHaveBeenCalled();
  });

  it('returns an existing favorite with no races', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [{ event: { id: eventId }, races: [] }],
    });
  });
});
