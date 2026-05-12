import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getRaceImageUrlWithFilename,
  getRaceImageUrl,
  getRaceImageUrls,
} from './image-url';

const MOCK_SUPABASE_URL = 'https://example.supabase.co';
const ORG_ID = 'org-123';
const RACE_ID = 'race-456';
const BASE_PATH = `${MOCK_SUPABASE_URL}/storage/v1/object/public/organizers/${ORG_ID}/${RACE_ID}`;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', MOCK_SUPABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getRaceImageUrlWithFilename', () => {
  it('should return correct URL with filename', () => {
    const result = getRaceImageUrlWithFilename(ORG_ID, RACE_ID, 'main-123456.webp');
    expect(result).toBe(`${BASE_PATH}/main-123456.webp`);
  });

  it('should return empty string when env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const result = getRaceImageUrlWithFilename(ORG_ID, RACE_ID, 'main.webp');
    expect(result).toBe('');
  });
});

describe('getRaceImageUrl', () => {
  it('should use filename directly when provided', () => {
    const result = getRaceImageUrl(ORG_ID, RACE_ID, undefined, false, 'main-123.webp');
    expect(result).toBe(`${BASE_PATH}/main-123.webp`);
  });

  it('should use main.{extension} when extension is provided but no filename', () => {
    const result = getRaceImageUrl(ORG_ID, RACE_ID, 'jpg');
    expect(result).toBe(`${BASE_PATH}/main.jpg`);
  });

  it('should default to main.webp when neither filename nor extension is provided', () => {
    const result = getRaceImageUrl(ORG_ID, RACE_ID);
    expect(result).toBe(`${BASE_PATH}/main.webp`);
  });

  it('should append cache-busting query param when bustCache is true', () => {
    const before = Date.now();
    const result = getRaceImageUrl(ORG_ID, RACE_ID, 'webp', true);
    const after = Date.now();
    expect(result).toMatch(/\?t=\d+$/);
    const timestamp = Number(result.split('?t=')[1]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should return empty string when env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(getRaceImageUrl(ORG_ID, RACE_ID)).toBe('');
  });
});

describe('getRaceImageUrls', () => {
  it('should return single-item array when filename is provided', () => {
    const result = getRaceImageUrls(ORG_ID, RACE_ID, 'main-123.webp');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(`${BASE_PATH}/main-123.webp`);
  });

  it('should return 4 URLs for all extensions when no filename is provided', () => {
    const result = getRaceImageUrls(ORG_ID, RACE_ID);
    expect(result).toHaveLength(4);
    expect(result[0]).toContain('main.webp');
    expect(result[1]).toContain('main.jpg');
    expect(result[2]).toContain('main.jpeg');
    expect(result[3]).toContain('main.png');
  });
});
