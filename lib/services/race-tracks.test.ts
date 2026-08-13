import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  findRaceTrackTargetById: vi.fn(),
  findRaceTrackTargets: vi.fn(),
  updateRaceTrackGeometry: vi.fn(),
}));

vi.mock('@/lib/db/race-tracks', () => ({
  findRaceTrackTargetById: mocks.findRaceTrackTargetById,
  findRaceTrackTargets: mocks.findRaceTrackTargets,
  updateRaceTrackGeometry: mocks.updateRaceTrackGeometry,
}));

import { importRaceTrack, saveRaceTrack } from '@/lib/services/race-tracks';

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const validTrack = new TextEncoder().encode(
  '<gpx version="1.1"><trk><trkseg>' +
    '<trkpt lon="1.7" lat="42.2"/><trkpt lon="1.8" lat="42.3"/>' +
    '</trkseg></trk></gpx>',
);

beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    'https://wghqldoshvwulyqqbqln.supabase.co';
  mocks.findRaceTrackTargets.mockResolvedValue([
    { id: 'race-1', name: 'Short' },
  ]);
  mocks.findRaceTrackTargetById.mockResolvedValue({
    id: 'race-1',
    eventSlug: 'pedraforca-xtrail',
  });
});

describe('saveRaceTrack', () => {
  it('updates the selected race and returns its event slug and summary', async () => {
    const result = await saveRaceTrack({ raceId: 'race-1', bytes: validTrack });

    expect(result).toMatchObject({
      raceId: 'race-1',
      eventSlug: 'pedraforca-xtrail',
      geometryType: 'LineString',
      pointCount: 2,
      segmentCount: 1,
    });
    expect(mocks.updateRaceTrackGeometry).toHaveBeenCalledOnce();
    expect(mocks.updateRaceTrackGeometry).toHaveBeenCalledWith(
      'race-1',
      expect.objectContaining({ type: 'LineString' }),
    );
  });

  it('returns 404 without updating when the race does not exist', async () => {
    mocks.findRaceTrackTargetById.mockResolvedValue(null);

    await expect(
      saveRaceTrack({ raceId: 'race-1', bytes: validTrack }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ValidationError>>({ status: 404 }),
    );
    expect(mocks.updateRaceTrackGeometry).not.toHaveBeenCalled();
  });

  it('does not query or update the database for malformed GPX', async () => {
    await expect(
      saveRaceTrack({ raceId: 'race-1', bytes: new TextEncoder().encode('bad') }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ValidationError>>({ status: 422 }),
    );
    expect(mocks.findRaceTrackTargetById).not.toHaveBeenCalled();
    expect(mocks.updateRaceTrackGeometry).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
});

describe('importRaceTrack', () => {
  it('validates and resolves a dry-run without mutating', async () => {
    const result = await importRaceTrack({
      eventSlug: 'pedraforca-xtrail',
      raceName: 'Short',
      bytes: validTrack,
      mode: 'dry-run',
    });

    expect(result).toMatchObject({
      mode: 'dry-run',
      raceId: 'race-1',
      pointCount: 2,
    });
    expect(mocks.updateRaceTrackGeometry).not.toHaveBeenCalled();
  });

  it('rejects a dry-run pointed at another project before parsing or lookup', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://production.supabase.co';

    await expect(
      importRaceTrack({
        eventSlug: 'pedraforca-xtrail',
        raceName: 'Short',
        bytes: validTrack,
        mode: 'dry-run',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mocks.findRaceTrackTargets).not.toHaveBeenCalled();
  });

  it.each([
    [[], 404],
    [
      [
        { id: 'race-1', name: 'Short' },
        { id: 'race-2', name: 'Short' },
      ],
      409,
    ],
  ])('rejects missing and ambiguous matches', async (matches, status) => {
    mocks.findRaceTrackTargets.mockResolvedValue(matches);

    await expect(
      importRaceTrack({
        eventSlug: 'pedraforca-xtrail',
        raceName: 'Short',
        bytes: validTrack,
        mode: 'apply',
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<ValidationError>>({ status }));
  });

  it('updates exactly the resolved race in apply mode', async () => {
    const result = await importRaceTrack({
      eventSlug: 'pedraforca-xtrail',
      raceName: 'Short',
      bytes: validTrack,
      mode: 'apply',
    });

    expect(result.mode).toBe('apply');
    expect(mocks.updateRaceTrackGeometry).toHaveBeenCalledOnce();
    expect(mocks.updateRaceTrackGeometry).toHaveBeenCalledWith(
      'race-1',
      expect.objectContaining({ type: 'LineString' }),
    );
  });

  it('returns identical processing diagnostics in dry-run and apply modes', async () => {
    const dryRun = await importRaceTrack({
      eventSlug: 'pedraforca-xtrail',
      raceName: 'Short',
      bytes: validTrack,
      mode: 'dry-run',
    });
    const applied = await importRaceTrack({
      eventSlug: 'pedraforca-xtrail',
      raceName: 'Short',
      bytes: validTrack,
      mode: 'apply',
    });
    expect(applied).toEqual({ ...dryRun, mode: 'apply' });
    expect(dryRun).toMatchObject({
      simplified: false,
      sourcePointCount: 2,
      removedPointCount: 0,
      toleranceMeters: null,
      targetMet: true,
    });
  });
});
