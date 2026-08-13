import type { Position } from 'geojson';
import type {
  ElevationProfile,
  ElevationProfileCursorPoint,
  ElevationProfilePoint,
  TrackGeometry,
  TrackRoute,
} from '@/types/race-track.types';

const EARTH_RADIUS_KM = 6_371.0088;
const DEFAULT_MAX_PROFILE_POINTS = 600;
const SLOPE_WINDOW_KM = 0.1;

function toRadians(value: number): number {
  return value * (Math.PI / 180);
}

function distanceBetween(left: Position, right: Position): number {
  const latitudeDelta = toRadians(right[1]! - left[1]!);
  const longitudeDelta = toRadians(right[0]! - left[0]!);
  const leftLatitude = toRadians(left[1]!);
  const rightLatitude = toRadians(right[1]!);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getSegments(geometry: TrackGeometry): Position[][] {
  return geometry.type === 'LineString'
    ? [geometry.coordinates]
    : geometry.coordinates;
}

export function downsampleElevationPoints(
  points: ElevationProfilePoint[],
  maximumPoints = DEFAULT_MAX_PROFILE_POINTS,
): ElevationProfilePoint[] {
  if (points.length <= maximumPoints) return points;
  if (maximumPoints < 4) return [points[0]!, points.at(-1)!];

  const first = points[0]!;
  const last = points.at(-1)!;
  const interior = points.slice(1, -1);
  const bucketCount = Math.max(1, Math.floor((maximumPoints - 2) / 2));
  const bucketSize = interior.length / bucketCount;
  const retained: Array<{ index: number; point: ElevationProfilePoint }> = [];

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor(bucket * bucketSize);
    const end = Math.min(interior.length, Math.floor((bucket + 1) * bucketSize));
    if (start >= end) continue;

    let minimumIndex = start;
    let maximumIndex = start;
    for (let index = start + 1; index < end; index += 1) {
      if (interior[index]!.elevationM < interior[minimumIndex]!.elevationM) {
        minimumIndex = index;
      }
      if (interior[index]!.elevationM > interior[maximumIndex]!.elevationM) {
        maximumIndex = index;
      }
    }

    retained.push({ index: minimumIndex, point: interior[minimumIndex]! });
    if (maximumIndex !== minimumIndex) {
      retained.push({ index: maximumIndex, point: interior[maximumIndex]! });
    }
  }

  return [
    first,
    ...retained.sort((left, right) => left.index - right.index).map(({ point }) => point),
    last,
  ];
}

export function buildElevationProfile(
  route: TrackRoute,
): ElevationProfile | null {
  const points: ElevationProfilePoint[] = [];
  let cumulativeDistanceKm = 0;

  for (const [segmentIndex, segment] of getSegments(route.geometry).entries()) {
    let previous: Position | null = null;
    for (const position of segment) {
      if (previous) cumulativeDistanceKm += distanceBetween(previous, position);
      previous = position;

      const elevation = position[2];
      if (typeof elevation === 'number' && Number.isFinite(elevation)) {
        points.push({
          coordinate: [position[0]!, position[1]!],
          distanceKm: cumulativeDistanceKm,
          elevationM: elevation,
          segmentIndex,
        });
      }
    }
  }

  if (points.length < 2) return null;

  const elevations = points.map(({ elevationM }) => elevationM);
  return {
    id: route.id,
    raceNames: route.raceNames,
    color: route.color,
    distanceKm: points.at(-1)!.distanceKm,
    minimumElevationM: Math.min(...elevations),
    maximumElevationM: Math.max(...elevations),
    points,
  };
}

function toCursorPoint(
  profile: ElevationProfile,
  point: ElevationProfilePoint,
  slopePercent: number,
): ElevationProfileCursorPoint {
  return {
    color: profile.color,
    coordinate: point.coordinate,
    distanceKm: point.distanceKm,
    elevationM: point.elevationM,
    routeId: profile.id,
    slopePercent,
  };
}

function getSlopePercent(
  points: ElevationProfilePoint[],
  anchorIndex: number,
  targetDistanceKm: number,
): number {
  const segmentIndex = points[anchorIndex]!.segmentIndex;
  let leftIndex = anchorIndex;
  let rightIndex = anchorIndex;

  while (
    points[rightIndex]!.distanceKm - points[leftIndex]!.distanceKm <
    SLOPE_WINDOW_KM
  ) {
    const canExpandLeft =
      leftIndex > 0 && points[leftIndex - 1]!.segmentIndex === segmentIndex;
    const canExpandRight =
      rightIndex < points.length - 1 &&
      points[rightIndex + 1]!.segmentIndex === segmentIndex;
    if (!canExpandLeft && !canExpandRight) break;

    const leftDistance = canExpandLeft
      ? targetDistanceKm - points[leftIndex - 1]!.distanceKm
      : Number.POSITIVE_INFINITY;
    const rightDistance = canExpandRight
      ? points[rightIndex + 1]!.distanceKm - targetDistanceKm
      : Number.POSITIVE_INFINITY;

    if (leftDistance <= rightDistance) leftIndex -= 1;
    else rightIndex += 1;
  }

  const distanceKm =
    points[rightIndex]!.distanceKm - points[leftIndex]!.distanceKm;
  if (distanceKm <= 0) return 0;

  const elevationDifferenceM =
    points[rightIndex]!.elevationM - points[leftIndex]!.elevationM;
  return elevationDifferenceM / (distanceKm * 10);
}

export function getElevationCursorPoint(
  profile: ElevationProfile,
  distanceKm: number,
): ElevationProfileCursorPoint {
  const points = profile.points;
  const target = Math.min(Math.max(distanceKm, 0), profile.distanceKm);
  let lower = 0;
  let upper = points.length;

  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (points[middle]!.distanceKm < target) lower = middle + 1;
    else upper = middle;
  }

  if (lower === 0) {
    return toCursorPoint(profile, points[0]!, getSlopePercent(points, 0, target));
  }
  if (lower === points.length) {
    const lastIndex = points.length - 1;
    return toCursorPoint(
      profile,
      points[lastIndex]!,
      getSlopePercent(points, lastIndex, target),
    );
  }

  const left = points[lower - 1]!;
  const right = points[lower]!;
  const distanceRange = right.distanceKm - left.distanceKm;
  if (left.segmentIndex !== right.segmentIndex || distanceRange <= 0) {
    const useLeft = target - left.distanceKm < right.distanceKm - target;
    const nearestIndex = useLeft ? lower - 1 : lower;
    return toCursorPoint(
      profile,
      points[nearestIndex]!,
      getSlopePercent(points, nearestIndex, target),
    );
  }

  const ratio = (target - left.distanceKm) / distanceRange;
  const anchorIndex = ratio <= 0.5 ? lower - 1 : lower;
  return {
    color: profile.color,
    coordinate: [
      left.coordinate[0] + (right.coordinate[0] - left.coordinate[0]) * ratio,
      left.coordinate[1] + (right.coordinate[1] - left.coordinate[1]) * ratio,
    ],
    distanceKm: target,
    elevationM: left.elevationM + (right.elevationM - left.elevationM) * ratio,
    routeId: profile.id,
    slopePercent: getSlopePercent(points, anchorIndex, target),
  };
}

export function buildElevationProfiles(
  routes: TrackRoute[],
): ElevationProfile[] {
  return routes
    .map(buildElevationProfile)
    .filter((profile): profile is ElevationProfile => profile !== null)
    .sort((left, right) => right.distanceKm - left.distanceKm);
}
