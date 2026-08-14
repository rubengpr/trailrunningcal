import { describe, expect, it } from 'vitest';
import { getDistanceGroup, normalizeRaceName } from './utils';

describe('getDistanceGroup', () => {
  it.each([
    [9.9, '0-10'],
    [10, '10-20'],
    [19.9, '10-20'],
    [20, '20-30'],
    [29.9, '20-30'],
    [30, '30-40'],
    [39.9, '30-40'],
    [40, '40-50'],
    [49.9, '40-50'],
    [50, '50+'],
  ] as const)('classifies %s km as %s', (distanceKm, expected) => {
    expect(getDistanceGroup(distanceKm)).toBe(expected);
  });
});

describe('normalizeRaceName', () => {
  it('trims valid names', () => {
    expect(normalizeRaceName('  Trail Barcelona  ')).toBe('Trail Barcelona');
  });

  it('keeps names containing letters or numbers', () => {
    expect(normalizeRaceName('100K')).toBe('100K');
    expect(normalizeRaceName('Marató')).toBe('Marató');
  });

  it('rejects non-strings and empty or symbol-only values', () => {
    expect(normalizeRaceName(null)).toBeNull();
    expect(normalizeRaceName('   ')).toBeNull();
    expect(normalizeRaceName('---')).toBeNull();
  });
});
