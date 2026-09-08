import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createClient: vi.fn(),
  getOrganizerRaceContext: vi.fn(),
  updateRaceTier: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));
vi.mock('@/lib/auth/organizer', () => ({
  getOrganizerRaceContext: mocks.getOrganizerRaceContext,
}));
vi.mock('@/lib/services/race-tiers', () => ({
  updateRaceTier: mocks.updateRaceTier,
}));

import { PATCH } from './route';

const RACE_ID = '5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba';
const supabase = { kind: 'user-client' };
const context = { params: Promise.resolve({ raceId: RACE_ID }) };

function request(priceEur: number | null) {
  return {
    json: vi.fn().mockResolvedValue({ priceEur }),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAuth.mockResolvedValue({
    user: { id: 'user-1' },
    isAdmin: false,
  });
  mocks.createClient.mockResolvedValue(supabase);
  mocks.getOrganizerRaceContext.mockResolvedValue({
    organizerId: 'organizer-1',
    race: { id: RACE_ID },
  });
  mocks.updateRaceTier.mockResolvedValue([{ price_eur: 35 }]);
});

describe('race tier authorization', () => {
  it('returns 401 before parsing input from an anonymous caller', async () => {
    mocks.requireAuth.mockRejectedValue(new AuthError());
    const patchRequest = request(35);

    const response = await PATCH(patchRequest, context);

    expect(response.status).toBe(401);
    expect(patchRequest.json).not.toHaveBeenCalled();
    expect(mocks.updateRaceTier).not.toHaveBeenCalled();
  });

  it('returns 403 without updating a tier for a non-owner', async () => {
    mocks.getOrganizerRaceContext.mockResolvedValue(null);

    const response = await PATCH(request(35), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(mocks.updateRaceTier).not.toHaveBeenCalled();
  });

  it('allows an owner to update a tier', async () => {
    const response = await PATCH(request(35), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ price_eur: 35 }],
    });
    expect(mocks.updateRaceTier).toHaveBeenCalledWith(RACE_ID, 35, false);
  });

  it('allows an admin without an ownership lookup', async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'admin-1' },
      isAdmin: true,
    });

    const response = await PATCH(request(null), context);

    expect(response.status).toBe(200);
    expect(mocks.getOrganizerRaceContext).not.toHaveBeenCalled();
    expect(mocks.updateRaceTier).toHaveBeenCalledWith(RACE_ID, null, true);
  });

  it('delegates unavailable-parent handling to the service', async () => {

    const response = await PATCH(request(35), context);

    expect(response.status).toBe(200);
    expect(mocks.updateRaceTier).toHaveBeenCalledWith(RACE_ID, 35, false);
  });
});
