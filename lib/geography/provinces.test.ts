import { describe, expect, it } from 'vitest';
import {
  PROVINCES,
  PUBLIC_PROVINCES,
  isValidProvince,
} from './provinces';

describe('province catalogue', () => {
  it('contains 52 Spanish territories plus Andorra without duplicates', () => {
    expect(PROVINCES).toHaveLength(53);
    expect(new Set(PROVINCES)).toHaveLength(53);
  });

  it('preserves every province value currently stored in the databases', () => {
    expect(PROVINCES).toEqual(expect.arrayContaining([
      'Andorra',
      'Barcelona',
      'Girona',
      'Lleida',
      'Tarragona',
    ]));
  });

  it('includes the supported Catalan and Valencian provinces in public filtering', () => {
    expect(PUBLIC_PROVINCES).toEqual([
      'Barcelona',
      'Girona',
      'Lleida',
      'Tarragona',
      'Alicante',
      'Castellón',
      'Valencia',
    ]);
  });
});

describe('isValidProvince', () => {
  it('accepts exact canonical values', () => {
    expect(isValidProvince('Girona')).toBe(true);
    expect(isValidProvince('A Coruña')).toBe(true);
    expect(isValidProvince('Araba/Álava')).toBe(true);
    expect(isValidProvince('Alicante')).toBe(true);
    expect(isValidProvince('Castellón')).toBe(true);
    expect(isValidProvince('Valencia')).toBe(true);
  });

  it.each([
    'Gerona',
    'girona',
    ' Girona',
    'Barcleona',
    'Alacant/Alicante',
    'Castelló/Castellón',
    'València/Valencia',
    '',
    null,
    undefined,
  ])(
    'rejects a non-canonical value: %s',
    (value) => {
      expect(isValidProvince(value)).toBe(false);
    },
  );
});
