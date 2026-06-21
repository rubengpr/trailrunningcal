import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getRaceAccessContext: vi.fn(),
  getRaceImage: vi.fn(),
  uploadRaceImage: vi.fn(),
  deleteRaceImage: vi.fn(),
  validateImageFile: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
  createAdminClient: mocks.createAdminClient,
}));
vi.mock('@/lib/auth/organizer', () => ({
  getRaceAccessContext: mocks.getRaceAccessContext,
}));
vi.mock('@/lib/services/race-image', () => ({
  getRaceImage: mocks.getRaceImage,
  uploadRaceImage: mocks.uploadRaceImage,
  deleteRaceImage: mocks.deleteRaceImage,
  validateImageFile: mocks.validateImageFile,
}));

import { DELETE, GET, POST } from './route';

const RACE_ID = 'race-1';
const ownerClient = { kind: 'owner' };
const adminClient = { kind: 'admin' };
const raceContext = {
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
    heroImageFilename: 'main-123.webp',
  },
};
const context = { params: Promise.resolve({ raceId: RACE_ID }) };

function requestWithFormData(file: unknown) {
  return {
    formData: vi.fn().mockResolvedValue(new Map([['image', file]])),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAuth.mockResolvedValue({
    user: { id: 'user-1' },
    isAdmin: false,
  });
  mocks.createClient.mockResolvedValue(ownerClient);
  mocks.createAdminClient.mockReturnValue(adminClient);
  mocks.getRaceAccessContext.mockResolvedValue(raceContext);
});

describe('race image authorization', () => {
  it('returns 401 before reading an image for an anonymous caller', async () => {
    mocks.requireAuth.mockRejectedValue(new AuthError());

    const response = await GET({} as NextRequest, context);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.getRaceAccessContext).not.toHaveBeenCalled();
    expect(mocks.getRaceImage).not.toHaveBeenCalled();
  });

  it('returns 403 without reading an image for a non-owner', async () => {
    mocks.getRaceAccessContext.mockResolvedValue(null);

    const response = await GET({} as NextRequest, context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(mocks.getRaceImage).not.toHaveBeenCalled();
  });

  it('allows an owner to read image status', async () => {
    const imageStatus = {
      hasImage: true,
      filename: 'main-123.webp',
      imageUrl: 'https://example.com/main-123.webp',
    };
    mocks.getRaceImage.mockResolvedValue(imageStatus);

    const response = await GET({} as NextRequest, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: imageStatus,
    });
    expect(mocks.getRaceAccessContext).toHaveBeenCalledWith(
      ownerClient,
      RACE_ID,
      false,
    );
    expect(mocks.getRaceImage).toHaveBeenCalledWith(ownerClient, RACE_ID);
  });

  it('allows an admin to upload an image with the admin client', async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'admin-1' },
      isAdmin: true,
    });
    mocks.uploadRaceImage.mockResolvedValue('main-456.webp');
    const file = { name: 'race.webp' };

    const response = await POST(requestWithFormData(file), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { filename: 'main-456.webp' },
    });
    expect(mocks.createAdminClient).toHaveBeenCalledOnce();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.getRaceAccessContext).toHaveBeenCalledWith(
      adminClient,
      RACE_ID,
      true,
    );
    expect(mocks.uploadRaceImage).toHaveBeenCalledWith(adminClient, {
      organizerId: 'organizer-1',
      raceId: RACE_ID,
      existingFilename: 'main-123.webp',
      file,
    });
  });

  it('rejects a non-owner before parsing or uploading an image', async () => {
    mocks.getRaceAccessContext.mockResolvedValue(null);
    const request = requestWithFormData({ name: 'race.webp' });

    const response = await POST(request, context);

    expect(response.status).toBe(403);
    expect(request.formData).not.toHaveBeenCalled();
    expect(mocks.validateImageFile).not.toHaveBeenCalled();
    expect(mocks.uploadRaceImage).not.toHaveBeenCalled();
  });

  it('allows an owner to delete an image', async () => {
    const response = await DELETE({} as NextRequest, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: null,
    });
    expect(mocks.deleteRaceImage).toHaveBeenCalledWith(
      ownerClient,
      'organizer-1',
      RACE_ID,
      'main-123.webp',
    );
  });
});
