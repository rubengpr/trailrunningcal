import { describe, it, expect } from 'vitest';
import {
  getRaceImageFilename,
  getVersionedRaceImageFilename,
  getExtensionFromMimeType,
} from './image-constants';

describe('getRaceImageFilename', () => {
  it('should return main.webp for webp extension', () => {
    expect(getRaceImageFilename('webp')).toBe('main.webp');
  });

  it('should return main.jpg for jpg extension', () => {
    expect(getRaceImageFilename('jpg')).toBe('main.jpg');
  });

  it('should follow main.{extension} format for any extension', () => {
    expect(getRaceImageFilename('png')).toBe('main.png');
    expect(getRaceImageFilename('jpeg')).toBe('main.jpeg');
  });
});

describe('getVersionedRaceImageFilename', () => {
  it('should match the main-{timestamp}.{ext} pattern', () => {
    const result = getVersionedRaceImageFilename('webp');
    expect(result).toMatch(/^main-\d+\.webp$/);
  });

  it('should contain a recent millisecond timestamp', () => {
    const before = Date.now();
    const result = getVersionedRaceImageFilename('jpg');
    const after = Date.now();
    const timestampMatch = result.match(/^main-(\d+)\.jpg$/);
    expect(timestampMatch).not.toBeNull();
    const timestamp = Number(timestampMatch![1]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should work for all supported extensions', () => {
    expect(getVersionedRaceImageFilename('jpg')).toMatch(/^main-\d+\.jpg$/);
    expect(getVersionedRaceImageFilename('jpeg')).toMatch(/^main-\d+\.jpeg$/);
    expect(getVersionedRaceImageFilename('png')).toMatch(/^main-\d+\.png$/);
  });
});

describe('getExtensionFromMimeType', () => {
  it('should return jpg for image/jpeg', () => {
    expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg');
  });

  it('should return png for image/png', () => {
    expect(getExtensionFromMimeType('image/png')).toBe('png');
  });

  it('should return webp for image/webp', () => {
    expect(getExtensionFromMimeType('image/webp')).toBe('webp');
  });

  it('should return jpg as safe default for unknown MIME type', () => {
    expect(getExtensionFromMimeType('image/gif')).toBe('jpg');
    expect(getExtensionFromMimeType('unknown/type')).toBe('jpg');
  });
});
