import { describe, expect, it } from 'vitest';
import { formatCost } from './format-cost';

describe('formatCost', () => {
  it('keeps the import precision by default', () => {
    expect(formatCost(1.5)).toBe('$1.5');
    expect(formatCost(0.004)).toBe('<$0.01');
    expect(formatCost(0)).toBe('$0');
    expect(formatCost(null)).toBe('—');
  });
  it('rounds to the requested precision', () => {
    expect(formatCost(0.2144124, 4)).toBe('$0.2144');
    expect(formatCost(0.00005, 4)).toBe('<$0.0001');
    expect(formatCost(0.12345, 4)).toBe('$0.1235');
  });
});
