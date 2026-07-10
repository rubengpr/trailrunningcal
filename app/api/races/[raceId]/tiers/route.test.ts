import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createClient: vi.fn(),
  getOrganizerRaceContext: vi.fn(),
  updateTierPrice: vi.fn(),
  getEventSlugForRace: vi.fn(),
  revalidateHomepages: vi.fn(),
  revalidateEventPages: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));
vi.mock('@/lib/auth/organizer', () => ({
  getOrganizerRaceContext: mocks.getOrganizerRaceContext,
}));
vi.mock('@/lib/db/race-tiers', () => ({
  updateTierPrice: mocks.updateTierPrice,
}));
vi.mock('@/lib/db/races', () => ({
  getEventSlugForRace: mocks.getEventSlugForRace,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidateHomepages: mocks.revalidateHomepages,
  revalidateEventPages: mocks.revalidateEventPages,
}));

import { PATCH } from './route';

const RACE_ID = 'race-1';
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
  mocks.updateTierPrice.mockResolvedValue([{ price_eur: 35 }]);
  mocks.getEventSlugForRace.mockResolvedValue('trail-event');
});

describe('race tier authorization', () => {
  it('returns 401 before parsing input from an anonymous caller', async () => {
    mocks.requireAuth.mockRejectedValue(new AuthError());
    const patchRequest = request(35);

    const response = await PATCH(patchRequest, context);

    expect(response.status).toBe(401);
    expect(patchRequest.json).not.toHaveBeenCalled();
    expect(mocks.updateTierPrice).not.toHaveBeenCalled();
  });

  it('returns 403 without updating a tier for a non-owner', async () => {
    mocks.getOrganizerRaceContext.mockResolvedValue(null);

    const response = await PATCH(request(35), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(mocks.updateTierPrice).not.toHaveBeenCalled();
    expect(mocks.revalidateHomepages).not.toHaveBeenCalled();
    expect(mocks.revalidateEventPages).not.toHaveBeenCalled();
  });

  it('allows an owner to update a tier', async () => {
    const response = await PATCH(request(35), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ price_eur: 35 }],
    });
    expect(mocks.updateTierPrice).toHaveBeenCalledWith(RACE_ID, 35, false);
    expect(mocks.revalidateHomepages).toHaveBeenCalledOnce();
    expect(mocks.getEventSlugForRace).toHaveBeenCalledWith(RACE_ID, false);
    expect(mocks.revalidateEventPages).toHaveBeenCalledWith('trail-event');
  });

  it('allows an admin without an ownership lookup', async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'admin-1' },
      isAdmin: true,
    });

    const response = await PATCH(request(null), context);

    expect(response.status).toBe(200);
    expect(mocks.getOrganizerRaceContext).not.toHaveBeenCalled();
    expect(mocks.updateTierPrice).toHaveBeenCalledWith(RACE_ID, null, true);
    expect(mocks.getEventSlugForRace).toHaveBeenCalledWith(RACE_ID, true);
  });

  it('still revalidates homepages when the parent event is unavailable', async () => {
    mocks.getEventSlugForRace.mockResolvedValue(null);

    const response = await PATCH(request(35), context);

    expect(response.status).toBe(200);
    expect(mocks.revalidateHomepages).toHaveBeenCalledOnce();
    expect(mocks.revalidateEventPages).not.toHaveBeenCalled();
  });
});
