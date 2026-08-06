import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUpcomingEventsPage: vi.fn(),
  requireAdmin: vi.fn(),
  createEventWithRaces: vi.fn(),
}));

vi.mock('@/lib/db/events', () => ({
  getUpcomingEventsPage: mocks.getUpcomingEventsPage,
}));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/events', () => ({
  createEventWithRaces: mocks.createEventWithRaces,
}));

import { GET } from './route';

function request(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/events${query}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUpcomingEventsPage.mockResolvedValue({
    events: [],
    page: 1,
    total: 0,
    hasMore: false,
    referenceDate: '2026-08-06',
  });
});

describe('GET /api/events', () => {
  it('returns a public event page', async () => {
    const response = await GET(request(
      '?page=2&referenceDate=2026-08-06&province=Girona',
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { page: 1, total: 0 },
    });
    expect(mocks.getUpcomingEventsPage).toHaveBeenCalledWith({
      page: 2,
      referenceDate: '2026-08-06',
      filters: {
        months: [],
        provinces: ['Girona'],
        distanceRanges: [],
        raceTypes: [],
      },
      scope: undefined,
    });
  });

  it('returns 400 for invalid query parameters', async () => {
    const response = await GET(request('?page=0'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid page' });
    expect(mocks.getUpcomingEventsPage).not.toHaveBeenCalled();
  });

  it('returns the standard error response when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getUpcomingEventsPage.mockRejectedValue(new Error('failed'));

    const response = await GET(request('?referenceDate=2026-08-06'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });
  });
});
