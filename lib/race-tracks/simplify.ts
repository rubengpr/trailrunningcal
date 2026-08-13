import type { Position } from 'geojson';
import {
  MAX_TRACK_SIMPLIFICATION_TOLERANCE_METERS,
  TARGET_TRACK_GEOMETRY_SIZE_BYTES,
  TARGET_TRACK_POINTS,
} from '@/lib/race-tracks/limits';
import type { TrackGeometry } from '@/types/race-track.types';

const EARTH_RADIUS_METERS = 6_371_008.8;
const TOLERANCE_STEP_METERS = 0.1;

export interface OptimizedTrack {
  geometry: TrackGeometry;
  pointCount: number;
  normalizedSizeBytes: number;
  simplified: boolean;
  toleranceMeters: number | null;
  targetMet: boolean;
}

interface ProjectedPoint {
  x: number;
  y: number;
}

function geometrySize(geometry: TrackGeometry): number {
  return new TextEncoder().encode(JSON.stringify(geometry)).byteLength;
}

function getSegments(geometry: TrackGeometry): Position[][] {
  return geometry.type === 'LineString'
    ? [geometry.coordinates]
    : geometry.coordinates;
}

function getPointCount(segments: Position[][]): number {
  return segments.reduce((total, segment) => total + segment.length, 0);
}

function meetsTarget(pointCount: number, sizeBytes: number): boolean {
  return (
    pointCount <= TARGET_TRACK_POINTS &&
    sizeBytes <= TARGET_TRACK_GEOMETRY_SIZE_BYTES
  );
}

function projectSegment(segment: Position[]): ProjectedPoint[] {
  const referenceLatitudeRadians =
    (segment.reduce((total, point) => total + point[1]!, 0) / segment.length) *
    (Math.PI / 180);
  const longitudeScale =
    (Math.PI / 180) *
    EARTH_RADIUS_METERS *
    Math.cos(referenceLatitudeRadians);
  const latitudeScale = (Math.PI / 180) * EARTH_RADIUS_METERS;

  return segment.map((point) => ({
    x: point[0]! * longitudeScale,
    y: point[1]! * latitudeScale,
  }));
}

function squaredDistanceToSegment(
  point: ProjectedPoint,
  start: ProjectedPoint,
  finish: ProjectedPoint,
): number {
  const deltaX = finish.x - start.x;
  const deltaY = finish.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const position =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - start.x) * deltaX +
              (point.y - start.y) * deltaY) /
              lengthSquared,
          ),
        );
  const nearestX = start.x + position * deltaX;
  const nearestY = start.y + position * deltaY;
  const distanceX = point.x - nearestX;
  const distanceY = point.y - nearestY;
  return distanceX * distanceX + distanceY * distanceY;
}

export function simplifyTrackSegment(
  segment: Position[],
  toleranceMeters: number,
): Position[] {
  if (segment.length <= 2) return segment;

  const points = projectSegment(segment);
  const toleranceSquared = toleranceMeters * toleranceMeters;
  const retained = new Uint8Array(segment.length);
  const ranges: Array<[number, number]> = [[0, segment.length - 1]];
  retained[0] = 1;
  retained[segment.length - 1] = 1;

  while (ranges.length > 0) {
    const [first, last] = ranges.pop()!;
    let maximumDistanceSquared = 0;
    let furthestIndex = -1;

    for (let index = first + 1; index < last; index += 1) {
      const distanceSquared = squaredDistanceToSegment(
        points[index]!,
        points[first]!,
        points[last]!,
      );
      if (distanceSquared > maximumDistanceSquared) {
        maximumDistanceSquared = distanceSquared;
        furthestIndex = index;
      }
    }

    if (
      furthestIndex !== -1 &&
      maximumDistanceSquared > toleranceSquared
    ) {
      retained[furthestIndex] = 1;
      ranges.push([first, furthestIndex], [furthestIndex, last]);
    }
  }

  return segment.filter((_, index) => retained[index] === 1);
}

function simplifyGeometry(
  geometry: TrackGeometry,
  toleranceMeters: number,
): TrackGeometry {
  const segments = getSegments(geometry).map((segment) =>
    simplifyTrackSegment(segment, toleranceMeters),
  );

  if (geometry.type === 'LineString') {
    return { type: 'LineString', coordinates: segments[0]! };
  }

  return {
    type: 'MultiLineString',
    coordinates: segments,
    ...(geometry.stages ? { stages: geometry.stages } : {}),
  };
}

function simplifyAtStep(
  geometry: TrackGeometry,
  step: number,
): OptimizedTrack {
  const toleranceMeters = step * TOLERANCE_STEP_METERS;
  const simplifiedGeometry = simplifyGeometry(geometry, toleranceMeters);
  const pointCount = getPointCount(getSegments(simplifiedGeometry));
  const normalizedSizeBytes = geometrySize(simplifiedGeometry);

  return {
    geometry: simplifiedGeometry,
    pointCount,
    normalizedSizeBytes,
    simplified: true,
    toleranceMeters,
    targetMet: meetsTarget(pointCount, normalizedSizeBytes),
  };
}

export function optimizeTrackGeometry(
  geometry: TrackGeometry,
): OptimizedTrack {
  const segments = getSegments(geometry);
  const pointCount = getPointCount(segments);
  const normalizedSizeBytes = geometrySize(geometry);
  if (meetsTarget(pointCount, normalizedSizeBytes)) {
    return {
      geometry,
      pointCount,
      normalizedSizeBytes,
      simplified: false,
      toleranceMeters: null,
      targetMet: true,
    };
  }

  const maximumStep = Math.round(
    MAX_TRACK_SIMPLIFICATION_TOLERANCE_METERS / TOLERANCE_STEP_METERS,
  );
  let lowerStep = 1;
  let upperStep = maximumStep;
  let best: OptimizedTrack | null = null;

  while (lowerStep <= upperStep) {
    const step = Math.floor((lowerStep + upperStep) / 2);
    const candidate = simplifyAtStep(geometry, step);
    if (candidate.targetMet) {
      best = candidate;
      upperStep = step - 1;
    } else {
      lowerStep = step + 1;
    }
  }

  return best ?? simplifyAtStep(geometry, maximumStep);
}
