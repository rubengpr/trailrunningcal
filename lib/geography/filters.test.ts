import { describe, expect, it } from 'vitest';
import { getRegionProvinces, parseLocationFilters } from './filters';

describe('location filters', () => {
  it('normalizes invalid regions and incompatible provinces', () => {
    expect(parseLocationFilters('galicia', 'Lugo')).toEqual({ region: 'galicia', province: 'Lugo' });
    expect(parseLocationFilters('galicia', 'Barcelona')).toEqual({ region: 'galicia', province: undefined });
    expect(parseLocationFilters('invalid', 'Barcelona')).toEqual({ region: undefined, province: 'Barcelona' });
    expect(parseLocationFilters('__proto__', 'invalid')).toEqual({ region: undefined, province: undefined });
  });
  it('uses the shared territory catalogue', () => {
    expect(getRegionProvinces('galicia')).toEqual(['A Coruña', 'Lugo', 'Ourense', 'Pontevedra']);
    expect(getRegionProvinces('andorra')).toEqual(['Andorra']);
  });
});
