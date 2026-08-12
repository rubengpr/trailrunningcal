import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { AuthError, ValidationError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireImportTrackSecret: vi.fn(),
  validateRaceTrackRequestSize: vi.fn(),
  validateRaceTrackRequest: vi.fn(),
  importRaceTrack: vi.fn(),
  revalidateEventPages: vi.fn(),
}));

vi.mock('@/lib/auth/race-track-import', () => ({
  requireImportTrackSecret: mocks.requireImportTrackSecret,
}));
vi.mock('@/app/api/race-tracks/validation', () => ({
  validateRaceTrackRequestSize: mocks.validateRaceTrackRequestSize,
  validateRaceTrackRequest: mocks.validateRaceTrackRequest,
}));
vi.mock('@/lib/services/race-tracks', () => ({
  importRaceTrack: mocks.importRaceTrack,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidateEventPages: mocks.revalidateEventPages,
}));

import { POST } from '@/app/api/race-tracks/route';

const file = new File(['track'], 'track.gpx');
const parsedInput = {
  eventSlug: 'pedraforca-xtrail',
  raceName: 'Short',
  mode: 'dry-run' as const,
  file,
};
const result = {
  mode: 'dry-run' as const,
  raceId: 'race-1',
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

beforeEach(() => {
  vi.resetAllMocks();
  mocks.validateRaceTrackRequest.mockReturnValue(parsedInput);
  mocks.importRaceTrack.mockResolvedValue(result);
});

describe('POST /api/race-tracks', () => {
  it('authenticates before parsing multipart input', async () => {
    mocks.requireImportTrackSecret.mockImplementation(() => {
      throw new AuthError();
    });
    const input = request();

    const response = await POST(input);

    expect(response.status).toBe(401);
    expect(mocks.validateRaceTrackRequestSize).not.toHaveBeenCalled();
    expect(input.formData).not.toHaveBeenCalled();
    expect(mocks.importRaceTrack).not.toHaveBeenCalled();
  });

  it('rejects an oversized request before parsing multipart input', async () => {
    mocks.validateRaceTrackRequestSize.mockImplementation(() => {
      throw new ValidationError('Invalid track file', 413);
    });
    const input = request();

    const response = await POST(input);

    expect(response.status).toBe(413);
    expect(mocks.validateRaceTrackRequestSize).toHaveBeenCalledWith(input.headers);
    expect(input.formData).not.toHaveBeenCalled();
    expect(mocks.importRaceTrack).not.toHaveBeenCalled();
  });

  it('returns a dry-run result without revalidation', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: result });
    expect(mocks.revalidateEventPages).not.toHaveBeenCalled();
  });

  it('returns 400 when the multipart body cannot be decoded', async () => {
    const input = request();
    vi.mocked(input.formData).mockRejectedValue(new TypeError('Invalid multipart body'));

    const response = await POST(input);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid input' });
    expect(mocks.validateRaceTrackRequest).not.toHaveBeenCalled();
    expect(mocks.importRaceTrack).not.toHaveBeenCalled();
  });

  it('revalidates only after an applied import succeeds', async () => {
    mocks.validateRaceTrackRequest.mockReturnValue({
      ...parsedInput,
      mode: 'apply',
    });
    mocks.importRaceTrack.mockResolvedValue({ ...result, mode: 'apply' });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.revalidateEventPages).toHaveBeenCalledWith(
      'pedraforca-xtrail',
    );
  });

  it('does not revalidate when the import fails', async () => {
    mocks.importRaceTrack.mockRejectedValue(
      new ValidationError('Invalid track file', 422),
    );

    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(mocks.revalidateEventPages).not.toHaveBeenCalled();
  });
});
