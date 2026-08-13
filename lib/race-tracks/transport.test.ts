// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { normalizeTrackForTransport } from '@/lib/race-tracks/transport';

describe('normalizeTrackForTransport', () => {
  it('retains tracks, routes, names, and elevation while dropping metadata', () => {
    const result = normalizeTrackForTransport(
      '<gpx><metadata><time>2026-01-01</time></metadata>' +
        '<trk><name>A &amp; B</name><trkseg>' +
        '<trkpt lon="1.123456789" lat="42.123456789"><ele>900.12</ele><time>now</time></trkpt>' +
        '<trkpt lon="1.2" lat="42.2"/></trkseg></trk>' +
        '<rte><name>Route</name><rtept lon="1.3" lat="42.3"/><rtept lon="1.4" lat="42.4"/></rte>' +
        '</gpx>',
    );

    expect(result).toContain('<name>A &amp; B</name>');
    expect(result).toContain(
      '<trkpt lon="1.123457" lat="42.123457"><ele>900.1</ele></trkpt>',
    );
    expect(result).toContain('<rte><name>Route</name>');
    expect(result).not.toContain('<metadata>');
    expect(result).not.toContain('<time>');
  });

  it.each([
    '<!DOCTYPE gpx><gpx />',
    '<gpx><trk>',
    '<gpx><trk><trkseg><trkpt lon="bad" lat="42"/></trkseg></trk></gpx>',
  ])('rejects unsafe or invalid input %#', (input) => {
    expect(() => normalizeTrackForTransport(input)).toThrow(
      'Invalid track file',
    );
  });
});
