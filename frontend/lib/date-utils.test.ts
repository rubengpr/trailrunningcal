import { describe, it, expect } from 'vitest';
import { formatDate, formatDateToSpanish, formatDateToCatalan } from './date-utils';

describe('formatDate', () => {
  describe('null input', () => {
    it('should return dash placeholders for null', () => {
      expect(formatDate(null)).toEqual({ day: '-', month: '-', dayOfWeek: '-' });
    });
  });

  describe('valid date string', () => {
    it('should return correct numeric day', () => {
      const result = formatDate('2025-11-30');
      expect(result.day).toBe(30);
    });

    it('should return Spanish short month', () => {
      const result = formatDate('2025-11-30');
      expect(result.month).toBe('nov');
    });

    it('should return Spanish short weekday', () => {
      const result = formatDate('2025-11-30');
      // Nov 30, 2025 is a Sunday → "dom" in Spanish
      expect(result.dayOfWeek).toBe('dom');
    });
  });

  describe('invalid date string', () => {
    it('should not throw for invalid string', () => {
      expect(() => formatDate('not-a-date')).not.toThrow();
    });
  });
});

describe('formatDateToSpanish', () => {
  describe('valid Date object', () => {
    it('should return correct Spanish formatted string', () => {
      const date = new Date('2025-11-30T12:00:00Z');
      const result = formatDateToSpanish(date);
      expect(result).toContain('noviembre');
      expect(result).toContain('2025');
    });
  });

  describe('valid ISO string', () => {
    it('should return correct Spanish formatted string', () => {
      const result = formatDateToSpanish('2025-06-15');
      expect(result).toContain('junio');
      expect(result).toContain('2025');
    });
  });

  describe('invalid string', () => {
    it('should return empty string for invalid date', () => {
      expect(formatDateToSpanish('not-a-date')).toBe('');
    });
  });
});

describe('formatDateToCatalan', () => {
  describe('valid Date object', () => {
    it('should return correct Catalan formatted string', () => {
      const date = new Date('2025-11-30T12:00:00Z');
      const result = formatDateToCatalan(date);
      expect(result).toContain('novembre');
      expect(result).toContain('2025');
    });
  });

  describe('valid ISO string', () => {
    it('should return correct Catalan formatted string', () => {
      const result = formatDateToCatalan('2025-06-15');
      expect(result).toContain('juny');
      expect(result).toContain('2025');
    });
  });

  describe('invalid string', () => {
    it('should return empty string for invalid date', () => {
      expect(formatDateToCatalan('not-a-date')).toBe('');
    });
  });
});
