import { randomBytes } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { DOMParser } from '@xmldom/xmldom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadRaceTrack } from '@/lib/api/race-tracks';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadRaceTrack', () => {
  it('compresses GPX files before sending them to the API', async () => {
    const result = {
      raceId: 'race-1',
      eventSlug: 'event',
      geometryType: 'LineString' as const,
      pointCount: 2,
      preSimplificationSizeBytes: 64,
      removedPointCount: 0,
      segmentCount: 1,
      simplified: false,
      sourcePointCount: 2,
      sourceSizeBytes: 128,
      normalizedSizeBytes: 64,
      targetMet: true,
      toleranceMeters: null,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: result }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const source = '<gpx><trk /></gpx>';

    await expect(
      uploadRaceTrack('race-1', new File([source], 'route.gpx')),
    ).resolves.toEqual(result);

    const [, request] = fetchMock.mock.calls[0]!;
    const body = request.body as FormData;
    const uploaded = body.get('file') as File;
    expect(uploaded.name).toBe('route.gpx.gz');
    expect(uploaded.type).toBe('application/gzip');
    expect(
      gunzipSync(new Uint8Array(await uploaded.arrayBuffer())).toString(),
    ).toBe(source);
  });

  it('normalizes GPX metadata when gzip alone exceeds the transport limit', async () => {
    vi.stubGlobal('DOMParser', DOMParser);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const telemetry = randomBytes(5 * 1024 * 1024).toString('base64');
    const source =
      `<gpx><metadata><extensions><data>${telemetry}</data></extensions></metadata>` +
      '<trk><name>Stage &amp; One</name><trkseg>' +
      '<trkpt lon="1.123456789" lat="42.123456789"><ele>900.12</ele><extensions><hr>150</hr></extensions></trkpt>' +
      '<trkpt lon="1.2" lat="42.2"><ele>950</ele></trkpt>' +
      '</trkseg></trk></gpx>';

    await uploadRaceTrack('race-1', new File([source], 'large.gpx'));

    const [, request] = fetchMock.mock.calls[0]!;
    const uploaded = (request.body as FormData).get('file') as File;
    const normalized = gunzipSync(
      new Uint8Array(await uploaded.arrayBuffer()),
    ).toString();
    expect(uploaded.size).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(normalized).toContain('<name>Stage &amp; One</name>');
    expect(normalized).toContain(
      '<trkpt lon="1.123457" lat="42.123457"><ele>900.1</ele></trkpt>',
    );
    expect(normalized).not.toContain('extensions');
    expect(normalized).not.toContain(telemetry);
  });
});
