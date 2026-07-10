import { describe, expect, it } from 'vitest';
import { normalizeRaceName } from './utils';

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
