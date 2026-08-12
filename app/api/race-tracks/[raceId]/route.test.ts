import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { AuthError, ValidationError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  validateRaceTrackRequestSize: vi.fn(),
  validateAdminRaceTrackRequest: vi.fn(),
  saveRaceTrack: vi.fn(),
  revalidateEventPages: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/app/api/race-tracks/validation', () => ({
  validateRaceTrackRequestSize: mocks.validateRaceTrackRequestSize,
  validateAdminRaceTrackRequest: mocks.validateAdminRaceTrackRequest,
}));
vi.mock('@/lib/services/race-tracks', () => ({
  saveRaceTrack: mocks.saveRaceTrack,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidateEventPages: mocks.revalidateEventPages,
}));

import { POST } from '@/app/api/race-tracks/[raceId]/route';

const raceId = '123e4567-e89b-42d3-a456-426614174000';
const file = new File(['track'], 'track.gpx');
const result = {
  raceId,
  eventSlug: 'pedraforca-xtrail',
  geometryType: 'LineString' as const,
  segmentCount: 1,
  pointCount: 2,
  normalizedSizeBytes: 64,
};

function request(): NextRequest {
  return {
    headers: new Headers(),
    formData: vi.fn().mockResolvedValue(new FormData()),
  } as unknown as NextRequest;
}

function context(id = raceId) {
  return { params: Promise.resolve({ raceId: id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.validateAdminRaceTrackRequest.mockReturnValue({ file });
  mocks.saveRaceTrack.mockResolvedValue(result);
});

describe('POST /api/race-tracks/[raceId]', () => {
  it('authenticates before inspecting request headers or multipart data', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());
    const input = request();

    const response = await POST(input, context());

    expect(response.status).toBe(401);
    expect(mocks.validateRaceTrackRequestSize).not.toHaveBeenCalled();
    expect(input.formData).not.toHaveBeenCalled();
  });

  it('rejects an oversized request before multipart parsing', async () => {
    mocks.validateRaceTrackRequestSize.mockImplementation(() => {
      throw new ValidationError('Invalid track file', 413);
    });
    const input = request();

    const response = await POST(input, context());

    expect(response.status).toBe(413);
    expect(input.formData).not.toHaveBeenCalled();
    expect(mocks.saveRaceTrack).not.toHaveBeenCalled();
  });

  it('rejects an invalid race UUID without parsing multipart data', async () => {
    const input = request();

    const response = await POST(input, context('not-a-uuid'));

    expect(response.status).toBe(400);
    expect(input.formData).not.toHaveBeenCalled();
  });

  it('returns 400 when multipart decoding or file validation fails', async () => {
    const invalidBody = request();
    vi.mocked(invalidBody.formData).mockRejectedValue(new TypeError('bad body'));
    const decodeResponse = await POST(invalidBody, context());
    expect(decodeResponse.status).toBe(400);

    mocks.validateAdminRaceTrackRequest.mockImplementation(() => {
      throw new ValidationError('Invalid input', 400);
    });
    const validationResponse = await POST(request(), context());
    expect(validationResponse.status).toBe(400);
    expect(mocks.saveRaceTrack).not.toHaveBeenCalled();
  });

  it('updates the race and revalidates both event locales on success', async () => {
    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: result });
    expect(mocks.saveRaceTrack).toHaveBeenCalledWith({
      raceId,
      bytes: expect.any(Uint8Array),
    });
    expect(mocks.revalidateEventPages).toHaveBeenCalledWith(
      'pedraforca-xtrail',
    );
  });

  it('returns safe domain and database errors without revalidating', async () => {
    mocks.saveRaceTrack.mockRejectedValueOnce(
      new ValidationError('Race not found', 404),
    );
    expect((await POST(request(), context())).status).toBe(404);

    mocks.saveRaceTrack.mockRejectedValueOnce(new Error('database details'));
    const databaseResponse = await POST(request(), context());
    expect(databaseResponse.status).toBe(500);
    await expect(databaseResponse.json()).resolves.toEqual({
      error: 'Internal server error',
    });
    expect(mocks.revalidateEventPages).not.toHaveBeenCalled();
  });
});
