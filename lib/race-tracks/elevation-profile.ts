import type { Position } from 'geojson';
import type {
  ElevationProfile,
  ElevationProfilePoint,
  TrackGeometry,
  TrackRoute,
} from '@/types/race-track.types';

const EARTH_RADIUS_KM = 6_371.0088;
const DEFAULT_MAX_PROFILE_POINTS = 600;

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

  for (const segment of getSegments(route.geometry)) {
    let previous: Position | null = null;
    for (const position of segment) {
      if (previous) cumulativeDistanceKm += distanceBetween(previous, position);
      previous = position;

      const elevation = position[2];
      if (typeof elevation === 'number' && Number.isFinite(elevation)) {
        points.push({
          distanceKm: cumulativeDistanceKm,
          elevationM: elevation,
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
    points: downsampleElevationPoints(points),
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
