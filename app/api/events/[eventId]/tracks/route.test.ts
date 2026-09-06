import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getEventTrackRoutes: vi.fn(),
}));

vi.mock('@/lib/db/events', () => ({
  getEventTrackRoutes: mocks.getEventTrackRoutes,
}));

import { GET } from './route';

const eventId = '123e4567-e89b-42d3-a456-426614174000';

function context(id = eventId) {
  return { params: Promise.resolve({ eventId: id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getEventTrackRoutes.mockResolvedValue([]);
});

describe('GET /api/events/[eventId]/tracks', () => {
  it('returns public routes for one event', async () => {
    const routes = [{ id: 'route-1', raceIds: ['race-1'] }];
    mocks.getEventTrackRoutes.mockResolvedValue(routes);

    const response = await GET(new Request('http://localhost?locale=en'), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { routes },
    });
    expect(mocks.getEventTrackRoutes).toHaveBeenCalledWith(eventId, 'en');
  });

  it('rejects malformed event IDs without querying', async () => {
    const response = await GET(
      new Request('http://localhost'),
      context('not-a-uuid'),
    );

    expect(response.status).toBe(400);
    expect(mocks.getEventTrackRoutes).not.toHaveBeenCalled();
  });

  it('returns 404 when the event does not exist', async () => {
    mocks.getEventTrackRoutes.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost'), context());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Event not found' });
  });
});
