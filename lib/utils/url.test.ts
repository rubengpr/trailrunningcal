import { describe, it, expect } from 'vitest';
import { cleanUrl } from './url';

describe('cleanUrl', () => {
  describe('protocol stripping', () => {
    it('should strip https://', () => {
      expect(cleanUrl('https://example.com')).toBe('example.com');
    });

    it('should strip http://', () => {
      expect(cleanUrl('http://example.com')).toBe('example.com');
    });
  });

  describe('www stripping', () => {
    it('should strip www.', () => {
      expect(cleanUrl('https://www.example.com')).toBe('example.com');
    });
  });

  describe('trailing slash', () => {
    it('should remove trailing slash', () => {
      expect(cleanUrl('https://example.com/')).toBe('example.com');
    });
  });

  describe('path preservation', () => {
    it('should keep path after domain', () => {
      expect(cleanUrl('https://example.com/some/path')).toBe('example.com/some/path');
    });
  });

  describe('no protocol', () => {
    it('should return the url unchanged if no protocol', () => {
      expect(cleanUrl('example.com')).toBe('example.com');
    });
  });
});
