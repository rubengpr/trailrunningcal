import { describe, expect, it } from 'vitest';
import { gzipSync } from 'node:zlib';
import { ValidationError } from '@/lib/errors';
import {
  MAX_TRACK_FILE_SIZE_BYTES,
  MAX_TRACK_SOURCE_POINTS,
  parseTrackFile,
} from '@/lib/race-tracks/parse';

function bytes(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

function route(points: string): Uint8Array {
  return bytes(`<gpx version="1.1"><trk><trkseg>${points}</trkseg></trk></gpx>`);
}

function point(longitude: number, latitude: number, elevation?: number): string {
  return `<trkpt lon="${longitude}" lat="${latitude}">${
    elevation === undefined ? '' : `<ele>${elevation}</ele>`
  }</trkpt>`;
}

describe('parseTrackFile', () => {
  it('normalizes a line and removes consecutive duplicate positions', () => {
    const result = parseTrackFile(
      route(
        point(1.123456789, 42.987654321, 123.456) +
          point(1.123456789, 42.987654321, 123.456) +
          point(1.2, 42.9),
      ),
    );

    expect(result).toMatchObject({
      geometry: {
        type: 'LineString',
        coordinates: [
          [1.123457, 42.987654, 123.5],
          [1.2, 42.9],
        ],
      },
      geometryType: 'LineString',
      pointCount: 2,
      sourcePointCount: 3,
      removedPointCount: 1,
      segmentCount: 1,
      simplified: false,
      toleranceMeters: null,
      targetMet: true,
      normalizedSizeBytes: expect.any(Number),
    });
  });

  it('discards telemetry without changing a small route', () => {
    const input = bytes(
      `<gpx><trk><trkseg>${point(1, 42, 900).replace(
        '</trkpt>',
        '<time>2026-01-01T00:00:00Z</time><extensions><power>200</power></extensions></trkpt>',
      )}${point(2, 43, 950)}</trkseg></trk></gpx>`,
    );

    const result = parseTrackFile(input);

    expect(result.geometry).toEqual({
      type: 'LineString',
      coordinates: [[1, 42, 900], [2, 43, 950]],
    });
    expect(result.preSimplificationSizeBytes).toBe(result.normalizedSizeBytes);
    expect(result.sourceSizeBytes).toBe(input.byteLength);
  });

  it('parses gzip transport and reports the decompressed source size', () => {
    const input = route(point(1, 42, 900) + point(2, 43, 950));
    const compressed = gzipSync(input);

    const result = parseTrackFile(compressed);

    expect(result.sourceSizeBytes).toBe(input.byteLength);
    expect(result.sourcePointCount).toBe(2);
    expect(result.geometry).toMatchObject({ type: 'LineString' });
  });

  it('rejects invalid gzip transport', () => {
    expect(() =>
      parseTrackFile(new Uint8Array([0x1f, 0x8b, 0x00, 0x01])),
    ).toThrow(ValidationError);
  });

  it('preserves multiple segments as separately rendered stages', () => {
    const input = bytes(
      `<gpx version="1.1"><trk><trkseg>${point(1, 42)}${point(2, 43)}</trkseg>` +
        `<trkseg>${point(3, 44)}${point(4, 45)}</trkseg></trk></gpx>`,
    );

    expect(parseTrackFile(input)).toMatchObject({
      geometry: {
        type: 'MultiLineString',
        stages: [
          { name: null, segmentIndex: 0, segmentCount: 1 },
          { name: null, segmentIndex: 1, segmentCount: 1 },
        ],
      },
      geometryType: 'MultiLineString',
      pointCount: 4,
      segmentCount: 2,
    });
  });

  it('preserves separately named tracks as stages', () => {
    const input = bytes(
      `<gpx version="1.1"><trk><name>ST1: First</name><trkseg>${point(1, 42)}${point(2, 43)}</trkseg></trk>` +
        `<trk><name>ST2: Second</name><trkseg>${point(3, 44)}${point(4, 45)}</trkseg>` +
        `<trkseg>${point(5, 46)}${point(6, 47)}</trkseg></trk></gpx>`,
    );

    expect(parseTrackFile(input)).toMatchObject({
      geometry: {
        type: 'MultiLineString',
        stages: [
          { name: 'ST1: First', segmentIndex: 0, segmentCount: 1 },
          { name: 'ST2: Second', segmentIndex: 1, segmentCount: 2 },
        ],
      },
      pointCount: 6,
      segmentCount: 3,
    });
  });

  it.each([
    '',
    '<html />',
    '<!DOCTYPE gpx><gpx />',
    '<!ENTITY x "bad"><gpx />',
    '<gpx><trk>',
    '<gpx><trk><trkseg><trkpt lon=1 lat=42/><trkpt lon=2 lat=43/></trkseg></trk></gpx>',
    '<gpx version="1.1"><wpt lon="1" lat="42" /></gpx>',
    `<gpx><trk><trkseg>${point(200, 42)}${point(2, 43)}</trkseg></trk></gpx>`,
  ])('rejects invalid input %#', (input) => {
    expect(() => parseTrackFile(bytes(input))).toThrow(ValidationError);
  });

  it('rejects files and point collections above their limits', () => {
    expect(() =>
      parseTrackFile(new Uint8Array(MAX_TRACK_FILE_SIZE_BYTES + 1)),
    ).toThrow(ValidationError);

    const points = Array.from(
      { length: MAX_TRACK_SOURCE_POINTS + 1 },
      (_, index) => point(1 + index / 1_000_000, 42),
    ).join('');
    expect(() => parseTrackFile(route(points))).toThrow(ValidationError);
  });

  it('rejects geometry that remains above hard limits at 3 metres', () => {
    const segments = Array.from(
      { length: 25_001 },
      (_, index) =>
        `<trkseg>${point(1 + index / 100_000, 42)}` +
        `${point(1 + index / 100_000, 42.00001)}</trkseg>`,
    ).join('');

    expect(() =>
      parseTrackFile(bytes(`<gpx><trk>${segments}</trk></gpx>`)),
    ).toThrow(expect.objectContaining({ status: 413 }));
  });

  it('rejects an invalid source point instead of silently dropping it', () => {
    const input = bytes(
      `<gpx><trk><trkseg>${point(1, 42)}` +
        '<trkpt lon="bad" lat="42.2"/>' +
        `${point(2, 43)}</trkseg></trk></gpx>`,
    );

    expect(() => parseTrackFile(input)).toThrow(ValidationError);
  });

  it.each(['', '   '])('rejects an empty coordinate value %#', (longitude) => {
    const input = bytes(
      `<gpx><trk><trkseg>${point(1, 42)}` +
        `<trkpt lon="${longitude}" lat="42.2"/>` +
        `${point(2, 43)}</trkseg></trk></gpx>`,
    );

    expect(() => parseTrackFile(input)).toThrow(ValidationError);
  });
});
