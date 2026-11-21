import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createStaticClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  in: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: mocks.createStaticClient,
}));

import { POST } from './route';

const event = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Trail Test',
  slug: 'trail-test',
};

function request(): NextRequest {
  return new NextRequest('http://localhost/api/events/favorites', {
    method: 'POST',
    body: JSON.stringify({ eventIds: [event.id] }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createStaticClient.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ in: mocks.in });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/events/favorites', () => {
  it('returns a successful empty list when saved events no longer exist', async () => {
    mocks.in.mockResolvedValueOnce({ data: [], error: null });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: [] });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('events');
  });

  it.each(['events', 'races'])('returns a generic 500 when reading %s fails', async (table) => {
    if (table === 'races') {
      mocks.in.mockResolvedValueOnce({ data: [event], error: null });
    }
    mocks.in.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database unavailable' },
    });

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
    expect(mocks.from).toHaveBeenLastCalledWith(table);
  });
});
