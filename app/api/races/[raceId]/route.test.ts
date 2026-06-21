import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createClient: vi.fn(),
  getOrganizerRaceContext: vi.fn(),
  getRaceById: vi.fn(),
  updateRace: vi.fn(),
  deleteRace: vi.fn(),
  revalidateRacePages: vi.fn(),
  revalidateHomepages: vi.fn(),
  revalidateProvincePage: vi.fn(),
  revalidateCategoryPages: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));
vi.mock('@/lib/auth/organizer', () => ({
  getOrganizerRaceContext: mocks.getOrganizerRaceContext,
}));
vi.mock('@/lib/db/races', () => ({
  getRaceById: mocks.getRaceById,
  updateRace: mocks.updateRace,
  deleteRace: mocks.deleteRace,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidateRacePages: mocks.revalidateRacePages,
  revalidateHomepages: mocks.revalidateHomepages,
  revalidateProvincePage: mocks.revalidateProvincePage,
  revalidateCategoryPages: mocks.revalidateCategoryPages,
}));

import { DELETE, PATCH } from './route';

const RACE_ID = 'race-1';
const supabase = { kind: 'user-client' };
const organizerContext = {
  organizerId: 'organizer-1',
  race: {
    id: RACE_ID,
    name: 'Trail Race',
    date: '2027-05-01',
    distanceKm: 21,
    elevationGainM: 900,
    city: 'Barcelona',
    province: 'Barcelona',
    description: null,
    organizerId: 'organizer-1',
  },
};
const patchBody = {
  date: '2027-05-02',
  name: 'Updated Trail Race',
  distanceKm: 24,
  elevationGainM: 1100,
  websiteUrl: 'https://example.com/race',
  city: 'Barcelona',
  province: 'Barcelona',
  description: 'Updated race description',
};
const context = { params: Promise.resolve({ raceId: RACE_ID }) };

function request(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAuth.mockResolvedValue({
    user: { id: 'user-1' },
    isAdmin: false,
  });
  mocks.createClient.mockResolvedValue(supabase);
  mocks.getOrganizerRaceContext.mockResolvedValue(organizerContext);
});

describe('race mutation authorization', () => {
  it('returns 401 before parsing a patch from an anonymous caller', async () => {
    mocks.requireAuth.mockRejectedValue(new AuthError());
    const patchRequest = request(patchBody);

    const response = await PATCH(patchRequest, context);

    expect(response.status).toBe(401);
    expect(patchRequest.json).not.toHaveBeenCalled();
    expect(mocks.getOrganizerRaceContext).not.toHaveBeenCalled();
    expect(mocks.updateRace).not.toHaveBeenCalled();
  });

  it('returns 403 without updating a race owned by someone else', async () => {
    mocks.getOrganizerRaceContext.mockResolvedValue(null);

    const response = await PATCH(request(patchBody), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(mocks.getRaceById).not.toHaveBeenCalled();
    expect(mocks.updateRace).not.toHaveBeenCalled();
  });

  it('allows an admin to update a race without an ownership lookup', async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'admin-1' },
      isAdmin: true,
    });
    mocks.getRaceById.mockResolvedValue({
      name: 'Trail Race',
      province: 'Barcelona',
      distance_km: 21,
      elevation_gain_m: 900,
    });
    const updatedRace = { id: RACE_ID, name: patchBody.name };
    mocks.updateRace.mockResolvedValue(updatedRace);

    const response = await PATCH(request(patchBody), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: updatedRace,
    });
    expect(mocks.getOrganizerRaceContext).not.toHaveBeenCalled();
    expect(mocks.updateRace).toHaveBeenCalledWith(
      RACE_ID,
      expect.objectContaining({ name: patchBody.name }),
      true,
    );
  });

  it('returns 403 without deleting a race owned by someone else', async () => {
    mocks.getOrganizerRaceContext.mockResolvedValue(null);

    const response = await DELETE({} as NextRequest, context);

    expect(response.status).toBe(403);
    expect(mocks.deleteRace).not.toHaveBeenCalled();
    expect(mocks.revalidateHomepages).not.toHaveBeenCalled();
  });

  it('allows an owner to delete their race', async () => {
    const response = await DELETE({} as NextRequest, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: null,
    });
    expect(mocks.deleteRace).toHaveBeenCalledWith(
      RACE_ID,
      false,
      'organizer-1',
    );
  });
});
