import { describe, expect, it } from 'vitest';
import { normalizeTrackImportBaseUrl } from '@/lib/race-tracks/project';

describe('normalizeTrackImportBaseUrl', () => {
  it.each([
    ['http://localhost:3000/path', 'http://localhost:3000'],
    ['http://127.0.0.1:3000', 'http://127.0.0.1:3000'],
    ['http://[::1]:3000', 'http://[::1]:3000'],
    ['https://preview.trailrunningcal.com/path', 'https://preview.trailrunningcal.com'],
  ])('accepts secure or loopback URL %s', (input, expected) => {
    expect(normalizeTrackImportBaseUrl(input)).toBe(expected);
  });

  it.each([
    'http://trailrunningcal.com',
    'http://preview.trailrunningcal.com',
    'ftp://trailrunningcal.com',
  ])('rejects an insecure remote URL %s', (input) => {
    expect(() => normalizeTrackImportBaseUrl(input)).toThrow(
      'Track imports require HTTPS except on localhost',
    );
  });
});
