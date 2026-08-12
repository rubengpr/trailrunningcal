import type { Position } from 'geojson';
import { isNonCompetitiveRace } from '@/lib/races/race-types';
import type {
  TrackEndpointGroup,
  TrackEndpointKind,
  TrackGeometry,
  TrackLineStyle,
  TrackRaceInput,
  TrackRoute,
} from '@/types/race-track.types';

const SHARED_ENDPOINT_COLOR = '#292524';

const TRACK_COLOR_PALETTES = {
  nonCompetitive: ['#eab308', '#f59e0b'],
  ultra: ['#171717', '#4b5563'],
  marathon: ['#dc2626', '#be123c'],
  medium: ['#2563eb', '#7c3aed'],
  short: ['#15803d', '#84cc16'],
} as const;

type TrackCategory = keyof typeof TRACK_COLOR_PALETTES;

interface TrackPresentation {
  category: TrackCategory;
  lineWidth: number;
  lineStyle: TrackLineStyle;
}

function getTrackPresentation(race: TrackRaceInput): TrackPresentation {
  if (isNonCompetitiveRace({ name: race.raceName })) {
    return {
      category: 'nonCompetitive',
      lineWidth: 3,
      lineStyle: 'dashed',
    };
  }
  if (race.distanceKm >= 50) {
    return { category: 'ultra', lineWidth: 10, lineStyle: 'solid' };
  }
  if (race.distanceKm >= 40) {
    return { category: 'marathon', lineWidth: 8, lineStyle: 'solid' };
  }
  if (race.distanceKm >= 20) {
    return { category: 'medium', lineWidth: 5.5, lineStyle: 'solid' };
  }
  return { category: 'short', lineWidth: 4, lineStyle: 'solid' };
}

function isPosition(value: unknown): value is Position {
  if (!Array.isArray(value) || (value.length !== 2 && value.length !== 3)) {
    return false;
  }

  const [longitude, latitude, elevation] = value;
  return (
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    (elevation === undefined ||
      (typeof elevation === 'number' && Number.isFinite(elevation)))
  );
}

function isLine(value: unknown): value is Position[] {
  return Array.isArray(value) && value.length >= 2 && value.every(isPosition);
}

export function toTrackGeometry(value: unknown): TrackGeometry | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as { type?: unknown; coordinates?: unknown };
  if (candidate.type === 'LineString' && isLine(candidate.coordinates)) {
    return { type: 'LineString', coordinates: candidate.coordinates };
  }

  if (
    candidate.type === 'MultiLineString' &&
    Array.isArray(candidate.coordinates) &&
    candidate.coordinates.length > 0 &&
    candidate.coordinates.every(isLine)
  ) {
    return { type: 'MultiLineString', coordinates: candidate.coordinates };
  }

  return null;
}

export function buildTrackRoutes(races: TrackRaceInput[]): TrackRoute[] {
  const grouped = new Map<
    string,
    Omit<TrackRoute, 'id' | 'color'> & { category: TrackCategory }
  >();

  for (const race of [...races].sort(
    (left, right) =>
      right.distanceKm - left.distanceKm ||
      left.raceName.localeCompare(right.raceName),
  )) {
    const presentation = getTrackPresentation(race);
    const key = JSON.stringify({ geometry: race.geometry, ...presentation });
    const route = grouped.get(key);

    if (route) {
      route.raceIds.push(race.raceId);
      route.raceNames.push(race.raceName);
      route.distanceKm = Math.max(route.distanceKm, race.distanceKm);
    } else {
      grouped.set(key, {
        raceIds: [race.raceId],
        raceNames: [race.raceName],
        distanceKm: race.distanceKm,
        ...presentation,
        geometry: race.geometry,
      });
    }
  }

  const categoryCounts = new Map<TrackCategory, number>();

  return [...grouped.values()]
    .sort(
      (left, right) =>
        Number(left.lineStyle === 'dashed') -
          Number(right.lineStyle === 'dashed') ||
        right.distanceKm - left.distanceKm ||
        left.raceNames[0]!.localeCompare(right.raceNames[0]!),
    )
    .map(({ category, ...route }, index) => {
      const categoryIndex = categoryCounts.get(category) ?? 0;
      categoryCounts.set(category, categoryIndex + 1);
      const palette = TRACK_COLOR_PALETTES[category];

      return {
        ...route,
        color: palette[categoryIndex % palette.length]!,
        id: `route-${index + 1}`,
      };
    });
}

interface MutableEndpointGroup {
  coordinate: [number, number];
  kinds: Set<TrackEndpointKind>;
  races: Map<string, { name: string; color: string }>;
  colors: Set<string>;
}

function addEndpointRaces(
  races: MutableEndpointGroup['races'],
  route: TrackRoute,
): void {
  for (const raceName of route.raceNames) {
    races.set(`${raceName}\u0000${route.color}`, {
      name: raceName,
      color: route.color,
    });
  }
}

function getRouteEndpoints(
  geometry: TrackGeometry,
): [[number, number], [number, number]] | null {
  const segments =
    geometry.type === 'LineString'
      ? [geometry.coordinates]
      : geometry.coordinates;
  const firstSegment = segments[0];
  const lastSegment = segments.at(-1);
  const start = firstSegment?.[0];
  const finish = lastSegment?.at(-1);
  if (!start || !finish) return null;

  return [
    [start[0]!, start[1]!],
    [finish[0]!, finish[1]!],
  ];
}

export function buildTrackEndpointGroups(
  routes: TrackRoute[],
): TrackEndpointGroup[] {
  const grouped = new Map<string, MutableEndpointGroup>();

  for (const route of routes) {
    const endpoints = getRouteEndpoints(route.geometry);
    if (!endpoints) continue;

    const entries: Array<[TrackEndpointKind, [number, number]]> = [
      ['start', endpoints[0]],
      ['finish', endpoints[1]],
    ];
    for (const [kind, coordinate] of entries) {
      const key = JSON.stringify(coordinate);
      const endpoint = grouped.get(key);
      if (endpoint) {
        endpoint.kinds.add(kind);
        addEndpointRaces(endpoint.races, route);
        endpoint.colors.add(route.color);
      } else {
        const races = new Map<string, { name: string; color: string }>();
        addEndpointRaces(races, route);
        grouped.set(key, {
          coordinate,
          kinds: new Set([kind]),
          races,
          colors: new Set([route.color]),
        });
      }
    }
  }

  return [...grouped.values()].map((endpoint, index) => ({
    id: `endpoint-${index + 1}`,
    coordinate: endpoint.coordinate,
    kinds: [...endpoint.kinds],
    raceNames: [...endpoint.races.values()].map((race) => race.name),
    races: [...endpoint.races.values()],
    color:
      endpoint.colors.size === 1
        ? endpoint.colors.values().next().value!
        : SHARED_ENDPOINT_COLOR,
  }));
}
