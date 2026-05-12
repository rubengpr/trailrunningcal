import { describe, it, expect } from 'vitest';
import { formatDurationMs } from './format-duration';

describe('formatDurationMs', () => {
  describe('negative input', () => {
    it('should treat negative values as zero', () => {
      expect(formatDurationMs(-500)).toBe('0.0 s');
    });
  });

  describe('under 60 seconds', () => {
    it('should return seconds with one decimal', () => {
      expect(formatDurationMs(0)).toBe('0.0 s');
      expect(formatDurationMs(1000)).toBe('1.0 s');
      expect(formatDurationMs(59999)).toBe('60.0 s');
    });
  });

  describe('60 seconds and over', () => {
    it('should return minutes and zero-padded seconds', () => {
      expect(formatDurationMs(60000)).toBe('1m 00 s');
      expect(formatDurationMs(90000)).toBe('1m 30 s');
      expect(formatDurationMs(3661000)).toBe('61m 01 s');
    });
  });
});
