import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/errors';
import {
  MAX_TRACK_FILE_SIZE_BYTES,
  MAX_TRACK_POINTS,
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

    expect(result).toEqual({
      geometry: {
        type: 'LineString',
        coordinates: [
          [1.123457, 42.987654, 123.5],
          [1.2, 42.9],
        ],
      },
      geometryType: 'LineString',
      pointCount: 2,
      segmentCount: 1,
      normalizedSizeBytes: expect.any(Number),
    });
  });

  it('combines multiple segments into a MultiLineString', () => {
    const input = bytes(
      `<gpx version="1.1"><trk><trkseg>${point(1, 42)}${point(2, 43)}</trkseg>` +
        `<trkseg>${point(3, 44)}${point(4, 45)}</trkseg></trk></gpx>`,
    );

    expect(parseTrackFile(input)).toMatchObject({
      geometryType: 'MultiLineString',
      pointCount: 4,
      segmentCount: 2,
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
      { length: MAX_TRACK_POINTS + 1 },
      (_, index) => point(1 + index / 1_000_000, 42),
    ).join('');
    expect(() => parseTrackFile(route(points))).toThrow(ValidationError);
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
