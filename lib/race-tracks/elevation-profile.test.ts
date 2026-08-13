import { describe, expect, it } from 'vitest';
import {
  buildElevationProfile,
  buildElevationProfiles,
  downsampleElevationPoints,
} from '@/lib/race-tracks/elevation-profile';
import type { TrackRoute } from '@/types/race-track.types';

function route(
  coordinates: number[][] | number[][][],
  type: 'LineString' | 'MultiLineString' = 'LineString',
  id = 'route-1',
): TrackRoute {
  return {
    id,
    raceIds: [id],
    raceNames: [id],
    distanceKm: 10,
    color: '#15803d',
    lineWidth: 4,
    lineStyle: 'solid',
    geometry: type === 'LineString'
      ? { type, coordinates: coordinates as number[][] }
      : { type, coordinates: coordinates as number[][][] },
  };
}

describe('elevation profiles', () => {
  it('calculates cumulative distance and elevation bounds', () => {
    const profile = buildElevationProfile(route([
      [1, 42, 900],
      [1.01, 42, 1_050],
      [1.02, 42, 980],
    ]));

    expect(profile).not.toBeNull();
    expect(profile?.distanceKm).toBeGreaterThan(1.6);
    expect(profile?.distanceKm).toBeLessThan(1.7);
    expect(profile?.minimumElevationM).toBe(900);
    expect(profile?.maximumElevationM).toBe(1_050);
  });

  it('does not add distance across disconnected segments', () => {
    const profile = buildElevationProfile(route([
      [[1, 42, 800], [1.01, 42, 850]],
      [[2, 43, 900], [2.01, 43, 950]],
    ], 'MultiLineString'));

    expect(profile?.distanceKm).toBeGreaterThan(1.6);
    expect(profile?.distanceKm).toBeLessThan(1.7);
  });

  it('omits routes without at least two elevation samples', () => {
    expect(buildElevationProfile(route([[1, 42], [1.01, 42, 850]]))).toBeNull();
  });

  it('supports flat and below-sea-level profiles', () => {
    const profiles = buildElevationProfiles([
      route([[1, 42, -10], [1.01, 42, -10]], 'LineString', 'flat'),
      route([[1, 42, -30], [1.03, 42, 20]], 'LineString', 'long'),
    ]);

    expect(profiles[0]?.id).toBe('long');
    expect(profiles[1]).toMatchObject({
      id: 'flat',
      minimumElevationM: -10,
      maximumElevationM: -10,
    });
  });

  it('downsamples while retaining endpoints and elevation extremes', () => {
    const points = Array.from({ length: 1_000 }, (_, index) => ({
      distanceKm: index / 10,
      elevationM: index === 321 ? -500 : index === 678 ? 2_500 : 1_000,
    }));
    const sampled = downsampleElevationPoints(points, 100);

    expect(sampled.length).toBeLessThanOrEqual(100);
    expect(sampled[0]).toEqual(points[0]);
    expect(sampled.at(-1)).toEqual(points.at(-1));
    expect(sampled).toContainEqual(points[321]);
    expect(sampled).toContainEqual(points[678]);
  });
});
