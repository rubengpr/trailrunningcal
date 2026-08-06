import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getPublicEventLocations: vi.fn(),
}));

vi.mock('@/lib/db/event-locations', () => ({
  getPublicEventLocations: mocks.getPublicEventLocations,
}));

import { POST } from './route';

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/event-locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/event-locations', () => {
  it('returns public coordinates for validated locations', async () => {
    mocks.getPublicEventLocations.mockResolvedValue([{
      city: 'Girona',
      province: 'Girona',
      latitude: 41.98,
      longitude: 2.82,
    }]);

    const response = await POST(request({
      locations: [{ city: 'Girona', province: 'Girona' }],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        locations: [{
          city: 'Girona',
          province: 'Girona',
          latitude: 41.98,
          longitude: 2.82,
        }],
      },
    });
  });

  it('returns 400 for malformed input', async () => {
    const response = await POST(request({ locations: [{ city: 'Girona' }] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid location' });
    expect(mocks.getPublicEventLocations).not.toHaveBeenCalled();
  });

  it('returns a generic 500 response for database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getPublicEventLocations.mockRejectedValue(new Error('failed'));

    const response = await POST(request({
      locations: [{ city: 'Girona', province: 'Girona' }],
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });
  });
});
