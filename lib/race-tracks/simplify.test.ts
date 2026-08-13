import { describe, expect, it } from 'vitest';
import type { Position } from 'geojson';
import {
  optimizeTrackGeometry,
  simplifyTrackSegment,
} from '@/lib/race-tracks/simplify';

const METERS_PER_LATITUDE_DEGREE = 111_195;
const METERS_PER_LONGITUDE_DEGREE_AT_42 =
  METERS_PER_LATITUDE_DEGREE * Math.cos((42 * Math.PI) / 180);

function point(xMeters: number, yMeters: number, elevation = 0): Position {
  return [
    1.7 + xMeters / METERS_PER_LONGITUDE_DEGREE_AT_42,
    42 + yMeters / METERS_PER_LATITUDE_DEGREE,
    elevation,
  ];
}

function distanceToSegment(
  value: Position,
  start: Position,
  finish: Position,
): number {
  const toMeters = (position: Position) => ({
    x: (position[0]! - 1.7) * METERS_PER_LONGITUDE_DEGREE_AT_42,
    y: (position[1]! - 42) * METERS_PER_LATITUDE_DEGREE,
  });
  const current = toMeters(value);
  const first = toMeters(start);
  const last = toMeters(finish);
  const deltaX = last.x - first.x;
  const deltaY = last.y - first.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const position = lengthSquared === 0
    ? 0
    : Math.min(
        1,
        Math.max(
          0,
          ((current.x - first.x) * deltaX +
            (current.y - first.y) * deltaY) /
            lengthSquared,
        ),
      );

  return Math.hypot(
    current.x - (first.x + position * deltaX),
    current.y - (first.y + position * deltaY),
  );
}

function maximumDeviation(
  original: Position[],
  simplified: Position[],
): number {
  return Math.max(
    ...original.map((position) =>
      Math.min(
        ...simplified.slice(1).map((finish, index) =>
          distanceToSegment(position, simplified[index]!, finish),
        ),
      ),
    ),
  );
}

describe('track simplification', () => {
  it('preserves endpoints and original elevations within the tolerance', () => {
    const segment = Array.from({ length: 101 }, (_, index) =>
      point(index, Math.sin(index / 5) * 1.5, 1_000 + index),
    );

    const simplified = simplifyTrackSegment(segment, 1);

    expect(simplified[0]).toBe(segment[0]);
    expect(simplified.at(-1)).toBe(segment.at(-1));
    expect(simplified.every((position) => segment.includes(position))).toBe(true);
    expect(maximumDeviation(segment, simplified)).toBeLessThanOrEqual(1.01);
  });

  it('leaves geometry below the optimization targets unchanged', () => {
    const geometry = {
      type: 'LineString' as const,
      coordinates: [point(0, 0, 900), point(100, 1, 950)],
    };

    expect(optimizeTrackGeometry(geometry)).toEqual({
      geometry,
      pointCount: 2,
      normalizedSizeBytes: expect.any(Number),
      simplified: false,
      toleranceMeters: null,
      targetMet: true,
    });
  });

  it('selects the minimum tenth-of-a-metre tolerance that meets the target', () => {
    const coordinates = Array.from({ length: 10_002 }, (_, index) =>
      point(index, index === 0 || index === 10_001 ? 0 : index % 2 ? 0.15 : -0.15),
    );

    const result = optimizeTrackGeometry({
      type: 'LineString',
      coordinates,
    });

    expect(result.targetMet).toBe(true);
    expect(result.toleranceMeters).toBe(0.2);
    expect(result.pointCount).toBe(2);
  });

  it('preserves stages and reports best effort at the 3 metre ceiling', () => {
    const first = Array.from({ length: 6_001 }, (_, index) =>
      point(index, index % 2 ? 4 : -4, 900 + index / 10),
    );
    const second = Array.from({ length: 6_001 }, (_, index) =>
      point(6_000 + index, index % 2 ? -4 : 4, 1_500 - index / 10),
    );
    const stages = [
      { name: 'ST1', segmentIndex: 0, segmentCount: 1 },
      { name: 'ST2', segmentIndex: 1, segmentCount: 1 },
    ];

    const result = optimizeTrackGeometry({
      type: 'MultiLineString',
      coordinates: [first, second],
      stages,
    });

    expect(result.toleranceMeters).toBe(3);
    expect(result.targetMet).toBe(false);
    expect(result.pointCount).toBeGreaterThan(10_000);
    expect(result.geometry).toMatchObject({ stages });
    expect(
      result.geometry.type === 'MultiLineString'
        ? result.geometry.coordinates.map((segment) => [
            segment[0],
            segment.at(-1),
          ])
        : [],
    ).toEqual([
      [first[0], first.at(-1)],
      [second[0], second.at(-1)],
    ]);
  });
});
