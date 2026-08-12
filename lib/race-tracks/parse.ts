import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { LineString, MultiLineString, Position } from 'geojson';
import { ValidationError } from '@/lib/errors';
import type { TrackGeometry } from '@/types/race-track.types';

export const MAX_TRACK_FILE_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_TRACK_GEOMETRY_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_TRACK_POINTS = 50_000;

const UNSAFE_XML_PATTERN = /<!\s*(?:DOCTYPE|ENTITY)\b/i;

export interface ParsedTrack {
  geometry: TrackGeometry;
  geometryType: TrackGeometry['type'];
  pointCount: number;
  segmentCount: number;
  normalizedSizeBytes: number;
}

function invalidTrack(status = 422): ValidationError {
  return new ValidationError('Invalid track file', status);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizePosition(position: Position): Position {
  const [longitude, latitude, elevation] = position;

  if (
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw invalidTrack();
  }

  if (elevation === undefined) {
    return [round(longitude, 6), round(latitude, 6)];
  }

  if (typeof elevation !== 'number' || !Number.isFinite(elevation)) {
    throw invalidTrack();
  }

  return [round(longitude, 6), round(latitude, 6), round(elevation, 1)];
}

function positionsMatch(left: Position, right: Position): boolean {
  return (
    left.length === right.length &&
    left.every((coordinate, index) => coordinate === right[index])
  );
}

function normalizeLine(coordinates: Position[]): Position[] | null {
  const normalized: Position[] = [];

  for (const position of coordinates) {
    const next = normalizePosition(position);
    const previous = normalized.at(-1);
    if (!previous || !positionsMatch(previous, next)) {
      normalized.push(next);
    }
  }

  return normalized.length >= 2 ? normalized : null;
}

function getSegments(geometry: LineString | MultiLineString): Position[][] {
  if (geometry.type === 'LineString') {
    const line = normalizeLine(geometry.coordinates);
    return line ? [line] : [];
  }

  return geometry.coordinates.flatMap((coordinates) => {
    const line = normalizeLine(coordinates);
    return line ? [line] : [];
  });
}

function validateSourcePoints(document: Document): void {
  const points = [
    ...Array.from(document.getElementsByTagName('trkpt')),
    ...Array.from(document.getElementsByTagName('rtept')),
  ];

  for (const point of points) {
    const longitudeValue = point.getAttribute('lon')?.trim();
    const latitudeValue = point.getAttribute('lat')?.trim();
    const longitude = Number(longitudeValue);
    const latitude = Number(latitudeValue);
    if (
      !longitudeValue ||
      !latitudeValue ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw invalidTrack();
    }

    const elevation = point.getElementsByTagName('ele')[0]?.textContent?.trim();
    if (
      elevation !== undefined &&
      (elevation.length === 0 || !Number.isFinite(Number(elevation)))
    ) {
      throw invalidTrack();
    }
  }
}

export function parseTrackFile(bytes: Uint8Array): ParsedTrack {
  if (bytes.byteLength === 0) {
    throw invalidTrack(400);
  }

  if (bytes.byteLength > MAX_TRACK_FILE_SIZE_BYTES) {
    throw invalidTrack(413);
  }

  let xml: string;
  try {
    xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw invalidTrack();
  }

  if (UNSAFE_XML_PATTERN.test(xml)) {
    throw invalidTrack();
  }

  let document: Document;
  try {
    document = new DOMParser({
      onError() {
        throw new Error('Invalid XML');
      },
    }).parseFromString(xml, 'application/xml') as unknown as Document;
  } catch {
    throw invalidTrack();
  }

  if (document.documentElement?.localName.toLowerCase() !== 'gpx') {
    throw invalidTrack();
  }

  validateSourcePoints(document);

  let collection;
  try {
    collection = gpx(document);
  } catch {
    throw invalidTrack();
  }

  const segments = collection.features.flatMap((feature) => {
    const geometry = feature.geometry;
    return geometry?.type === 'LineString' || geometry?.type === 'MultiLineString'
      ? getSegments(geometry)
      : [];
  });

  const pointCount = segments.reduce(
    (total, coordinates) => total + coordinates.length,
    0,
  );

  if (segments.length === 0 || pointCount === 0) {
    throw invalidTrack();
  }

  if (pointCount > MAX_TRACK_POINTS) {
    throw invalidTrack();
  }

  const geometry: TrackGeometry =
    segments.length === 1
      ? { type: 'LineString', coordinates: segments[0]! }
      : { type: 'MultiLineString', coordinates: segments };
  const normalizedSizeBytes = new TextEncoder().encode(
    JSON.stringify(geometry),
  ).byteLength;

  if (normalizedSizeBytes > MAX_TRACK_GEOMETRY_SIZE_BYTES) {
    throw invalidTrack();
  }

  return {
    geometry,
    geometryType: geometry.type,
    pointCount,
    segmentCount: segments.length,
    normalizedSizeBytes,
  };
}
