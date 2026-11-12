import { describe, expect, it } from 'vitest';
import { getFilterProvinces, parseLocationFilters } from './filters';

describe('multiple location filters', () => {
  it('accepts old URLs and deduplicates repeated parameters', () => {
    expect(parseLocationFilters('galicia', 'Lugo')).toEqual({ regions: ['galicia'], provinces: ['Lugo'] });
    expect(parseLocationFilters(['galicia', 'galicia', '__proto__'], ['Lugo', 'Lugo', 'Barcelona']))
      .toEqual({ regions: ['galicia'], provinces: ['Lugo'] });
  });
  it('keeps only provinces belonging to any selected community', () => {
    expect(parseLocationFilters(['galicia', 'catalonia'], ['Lugo', 'Barcelona', 'Madrid']))
      .toEqual({ regions: ['galicia', 'catalonia'], provinces: ['Lugo', 'Barcelona'] });
    expect(parseLocationFilters([], ['Madrid'])).toEqual({ regions: [], provinces: ['Madrid'] });
  });
  it('resolves selected provinces or the community union for database filtering', () => {
    expect(getFilterProvinces(['galicia', 'andorra']))
      .toEqual(['A Coruña', 'Lugo', 'Ourense', 'Pontevedra', 'Andorra']);
    expect(getFilterProvinces(['galicia'], ['Lugo', 'Ourense'])).toEqual(['Lugo', 'Ourense']);
    expect(getFilterProvinces()).toBeUndefined();
  });
});
