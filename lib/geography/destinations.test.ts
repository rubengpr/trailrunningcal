import { describe, expect, it } from 'vitest';
import { BASE_URL } from '@/lib/config';
import {
  DESTINATION_PROVINCE_IDS,
  GEOGRAPHY,
  buildDestinationAlternateLinks,
  buildRegionAlternateLinks,
  getDestinationBySlugs,
  getDestinationPath,
  getProvinceByDbName,
  getRegionPath,
  getRegionProvinceIds,
  getSingleProvinceId,
} from './destinations';
import { PROVINCES } from './provinces';
import ca from '@/locales/ca/translation.json';
import en from '@/locales/en/translation.json';
import es from '@/locales/es/translation.json';
import fr from '@/locales/fr/translation.json';

describe('getDestinationPath', () => {
  it('returns the destination path for a locale, region, and province', () => {
    expect(getDestinationPath('es', 'catalonia', 'barcelona')).toBe(
      '/es/d/cataluna/barcelona',
    );
    expect(getDestinationPath('ca', 'catalonia', 'barcelona')).toBe(
      '/ca/d/cataluna/barcelona',
    );
    expect(getDestinationPath('es', 'valencianCommunity', 'castellon')).toBe(
      '/es/d/comunidad-valenciana/castellon',
    );
    expect(getDestinationPath('es', 'andalusia', 'granada')).toBe(
      '/es/d/andalucia/granada',
    );
    expect(getDestinationPath('es', 'andorra', 'andorra')).toBe(
      '/es/d/andorra/andorra',
    );
  });
});

describe('buildDestinationAlternateLinks', () => {
  it('returns hreflang URLs for a destination page', () => {
    expect(buildDestinationAlternateLinks('catalonia', 'barcelona')).toEqual({
      es: `${BASE_URL}/es/d/cataluna/barcelona`,
      ca: `${BASE_URL}/ca/d/cataluna/barcelona`,
      en: `${BASE_URL}/en/d/cataluna/barcelona`,
      fr: `${BASE_URL}/fr/d/cataluna/barcelona`,
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

  it('resolves a Valencian destination', () => {
    expect(getDestinationBySlugs('comunidad-valenciana', 'valencia')).toMatchObject({
      regionId: 'valencianCommunity',
      provinceId: 'valencia',
      province: { dbName: 'Valencia' },
    });
  });

  it.each([
    ['andalucia', 'granada'],
    ['galicia', 'a-coruna'],
    ['pais-vasco', 'araba'],
    ['canarias', 'santa-cruz-de-tenerife'],
    ['ceuta', 'ceuta'],
    ['melilla', 'melilla'],
    ['andorra', 'andorra'],
  ])('resolves %s/%s', (regionSlug, provinceSlug) => {
    const destination = getDestinationBySlugs(regionSlug, provinceSlug);

    expect(destination).not.toBeNull();
    expect(es.provincia.names[destination!.provinceId]).toBeTruthy();
  });

  it('returns null for invalid region or province slugs', () => {
    expect(getDestinationBySlugs('madrid', 'barcelona')).toBeNull();
    expect(getDestinationBySlugs('cataluna', 'not-a-province')).toBeNull();
  });
});

describe('destination catalogue', () => {
  it('maps every accepted province to exactly one public destination', () => {
    expect(DESTINATION_PROVINCE_IDS).toHaveLength(PROVINCES.length);
    expect(DESTINATION_PROVINCE_IDS.map(
      (provinceId) => GEOGRAPHY.provinces[provinceId].dbName,
    ).sort()).toEqual([...PROVINCES].sort());
  });

  it('round-trips every destination through its canonical path segments', () => {
    for (const provinceId of DESTINATION_PROVINCE_IDS) {
      const province = GEOGRAPHY.provinces[provinceId];
      const region = GEOGRAPHY.regions[province.regionId];

      expect(getDestinationBySlugs(region.slug, province.slug)).toMatchObject({
        provinceId,
        regionId: province.regionId,
      });
    }
  });

  it('provides every destination and region label in every public locale', () => {
    for (const translation of [es, ca, en, fr]) {
      for (const provinceId of DESTINATION_PROVINCE_IDS) {
        expect(translation.provincia.names[provinceId]).toBeTruthy();
      }

      for (const regionId of Object.keys(GEOGRAPHY.regions)) {
        expect(translation.geography.regions[regionId as keyof typeof GEOGRAPHY.regions]).toBeTruthy();
      }

      expect(translation.provincia.pageDescription).toContain('{province}');
      expect(translation.provincia.heroSubtitle).toContain('{province}');
      expect(translation.comunidad.pageDescription).toContain('{region}');
      expect(translation.comunidad.heroSubtitle).toContain('{region}');
      expect(translation.comunidad.provincesHeading).toContain('{region}');
    }
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
    expect(getProvinceByDbName('Alicante')).toMatchObject({
      id: 'alicante',
      province: { slug: 'alicante' },
    });
  });
});

describe('getRegionPath', () => {
  it('returns the community path for a locale', () => {
    expect(getRegionPath('es', 'catalonia')).toBe('/es/d/cataluna');
    expect(getRegionPath('fr', 'valencianCommunity')).toBe(
      '/fr/d/comunidad-valenciana',
    );
    expect(getRegionPath('es', 'murcia')).toBe('/es/d/region-de-murcia');
  });
});

describe('buildRegionAlternateLinks', () => {
  it('links every locale and defaults to Spanish', () => {
    const alternates = buildRegionAlternateLinks('aragon');

    expect(alternates).toEqual({
      es: `${BASE_URL}/es/d/aragon`,
      ca: `${BASE_URL}/ca/d/aragon`,
      en: `${BASE_URL}/en/d/aragon`,
      fr: `${BASE_URL}/fr/d/aragon`,
      'x-default': `${BASE_URL}/es/d/aragon`,
    });
  });
});

describe('getRegionProvinceIds', () => {
  it('groups every province under its community', () => {
    expect(getRegionProvinceIds('catalonia')).toEqual([
      'barcelona',
      'girona',
      'lleida',
      'tarragona',
    ]);
    expect(getRegionProvinceIds('murcia')).toEqual(['murcia']);

    const grouped = Object.keys(GEOGRAPHY.regions).flatMap((regionId) =>
      getRegionProvinceIds(regionId as keyof typeof GEOGRAPHY.regions),
    );
    expect(grouped.sort()).toEqual([...DESTINATION_PROVINCE_IDS].sort());
  });
});

describe('getSingleProvinceId', () => {
  it('identifies the communities that canonicalise to their province page', () => {
    expect(getSingleProvinceId('murcia')).toBe('murcia');
    expect(getSingleProvinceId('madrid')).toBe('madrid');
    expect(getSingleProvinceId('asturias')).toBe('asturias');
    expect(getSingleProvinceId('catalonia')).toBeNull();
    expect(getSingleProvinceId('canaryIslands')).toBeNull();
  });
});
