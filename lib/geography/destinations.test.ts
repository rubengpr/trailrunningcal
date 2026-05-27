import { describe, expect, it } from 'vitest';
import { BASE_URL } from '@/lib/config';
import {
  buildDestinationAlternateLinks,
  getDestinationBySlugs,
  getDestinationPath,
  getProvinceByDbName,
} from './destinations';

describe('getDestinationPath', () => {
  it('returns the destination path for a locale, region, and province', () => {
    expect(getDestinationPath('es', 'catalonia', 'barcelona')).toBe(
      '/es/d/cataluna/barcelona',
    );
    expect(getDestinationPath('ca', 'catalonia', 'barcelona')).toBe(
      '/ca/d/cataluna/barcelona',
    );
  });
});

describe('buildDestinationAlternateLinks', () => {
  it('returns hreflang URLs for a destination page', () => {
    expect(buildDestinationAlternateLinks('catalonia', 'barcelona')).toEqual({
      es: `${BASE_URL}/es/d/cataluna/barcelona`,
      ca: `${BASE_URL}/ca/d/cataluna/barcelona`,
      'x-default': `${BASE_URL}/es/d/cataluna/barcelona`,
    });
  });
});

describe('getDestinationBySlugs', () => {
  it('resolves a valid region and province pair', () => {
    expect(getDestinationBySlugs('cataluna', 'barcelona')).toMatchObject({
      regionId: 'catalonia',
      provinceId: 'barcelona',
      province: {
        dbName: 'Barcelona',
      },
    });
  });

  it('returns null for invalid region or province slugs', () => {
    expect(getDestinationBySlugs('madrid', 'barcelona')).toBeNull();
    expect(getDestinationBySlugs('cataluna', 'not-a-province')).toBeNull();
  });
});

describe('getProvinceByDbName', () => {
  it('resolves the destination province from the existing race province value', () => {
    expect(getProvinceByDbName('Girona')).toMatchObject({
      id: 'girona',
      province: {
        slug: 'girona',
      },
    });
  });
});
