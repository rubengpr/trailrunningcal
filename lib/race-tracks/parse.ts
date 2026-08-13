import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { gunzipSync } from 'node:zlib';
import type { LineString, MultiLineString, Position } from 'geojson';
import { ValidationError } from '@/lib/errors';
import {
  MAX_TRACK_FILE_SIZE_BYTES,
  MAX_TRACK_GEOMETRY_SIZE_BYTES,
  MAX_TRACK_POINTS,
  MAX_TRACK_SOURCE_POINTS,
} from '@/lib/race-tracks/limits';
import { optimizeTrackGeometry } from '@/lib/race-tracks/simplify';
import type { TrackGeometry, TrackStage } from '@/types/race-track.types';

export {
  MAX_TRACK_FILE_SIZE_BYTES,
  MAX_TRACK_GEOMETRY_SIZE_BYTES,
  MAX_TRACK_POINTS,
  MAX_TRACK_SOURCE_POINTS,
} from '@/lib/race-tracks/limits';

const UNSAFE_XML_PATTERN = /<!\s*(?:DOCTYPE|ENTITY)\b/i;

export interface ParsedTrack {
  geometry: TrackGeometry;
  geometryType: TrackGeometry['type'];
  pointCount: number;
  preSimplificationSizeBytes: number;
  removedPointCount: number;
  segmentCount: number;
  simplified: boolean;
  sourcePointCount: number;
  sourceSizeBytes: number;
  normalizedSizeBytes: number;
  targetMet: boolean;
  toleranceMeters: number | null;
}

function invalidTrack(status = 422): ValidationError {
  return new ValidationError('Invalid track file', status);
}

function decompressTrackFile(bytes: Uint8Array): Uint8Array {
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) return bytes;

  try {
    return gunzipSync(bytes, {
      maxOutputLength: MAX_TRACK_FILE_SIZE_BYTES + 1,
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ERR_BUFFER_TOO_LARGE'
    ) {
      throw invalidTrack(413);
    }
    throw invalidTrack();
  }
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

function getTrackName(track: Element): string | null {
  const name = Array.from(track.childNodes).find(
    (node) =>
      node.nodeType === 1 && node.nodeName.toLowerCase() === 'name',
  )?.textContent?.trim();

  return name ? name.slice(0, 200) : null;
}

function validateSourcePoints(document: Document): number {
  const points = [
    ...Array.from(document.getElementsByTagName('trkpt')),
    ...Array.from(document.getElementsByTagName('rtept')),
  ];

  if (points.length > MAX_TRACK_SOURCE_POINTS) {
    throw invalidTrack(413);
  }

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

  return points.length;
}

export function parseTrackFile(bytes: Uint8Array): ParsedTrack {
  if (bytes.byteLength === 0) {
    throw invalidTrack(400);
  }

  if (bytes.byteLength > MAX_TRACK_FILE_SIZE_BYTES) {
    throw invalidTrack(413);
  }

  const sourceBytes = decompressTrackFile(bytes);
  if (sourceBytes.byteLength > MAX_TRACK_FILE_SIZE_BYTES) {
    throw invalidTrack(413);
  }

  let xml: string;
  try {
    xml = new TextDecoder('utf-8', { fatal: true }).decode(sourceBytes);
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

  const sourcePointCount = validateSourcePoints(document);

  let collection;
  try {
    collection = gpx(document);
  } catch {
    throw invalidTrack();
  }

  const featureSegments = collection.features.flatMap((feature) => {
    const geometry = feature.geometry;
    return geometry?.type === 'LineString' || geometry?.type === 'MultiLineString'
      ? [getSegments(geometry)]
      : [];
  });
  const segments = featureSegments.flat();

  const tracks = Array.from(document.getElementsByTagName('trk'));
  let stages: TrackStage[] | undefined;
  if (tracks.length > 1 && tracks.length === featureSegments.length) {
    let segmentIndex = 0;
    stages = tracks.flatMap((track, index) => {
      const segmentCount = featureSegments[index]!.length;
      if (segmentCount === 0) return [];

      const stage = {
        name: getTrackName(track),
        segmentIndex,
        segmentCount,
      };
      segmentIndex += segmentCount;
      return [stage];
    });
  } else if (tracks.length === 1 && segments.length > 1) {
    stages = segments.map((_, segmentIndex) => ({
      name: null,
      segmentIndex,
      segmentCount: 1,
    }));
  }

  const preSimplificationPointCount = segments.reduce(
    (total, coordinates) => total + coordinates.length,
    0,
  );

  if (segments.length === 0 || preSimplificationPointCount === 0) {
    throw invalidTrack();
  }

  const normalizedGeometry: TrackGeometry =
    segments.length === 1
      ? { type: 'LineString', coordinates: segments[0]! }
      : {
          type: 'MultiLineString',
          coordinates: segments,
          ...(stages && stages.length > 1 ? { stages } : {}),
        };
  const preSimplificationSizeBytes = new TextEncoder().encode(
    JSON.stringify(normalizedGeometry),
  ).byteLength;
  const optimized = optimizeTrackGeometry(normalizedGeometry);

  if (
    optimized.pointCount > MAX_TRACK_POINTS ||
    optimized.normalizedSizeBytes > MAX_TRACK_GEOMETRY_SIZE_BYTES
  ) {
    throw invalidTrack(413);
  }

  return {
    geometry: optimized.geometry,
    geometryType: optimized.geometry.type,
    pointCount: optimized.pointCount,
    preSimplificationSizeBytes,
    removedPointCount: sourcePointCount - optimized.pointCount,
    segmentCount: segments.length,
    simplified: optimized.simplified,
    sourcePointCount,
    sourceSizeBytes: sourceBytes.byteLength,
    normalizedSizeBytes: optimized.normalizedSizeBytes,
    targetMet: optimized.targetMet,
    toleranceMeters: optimized.toleranceMeters,
  };
}
