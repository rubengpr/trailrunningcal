import { locales } from '@/i18n';
import { BASE_URL } from '@/lib/config';

export const GEOGRAPHY = {
  regions: {
    catalonia: {
      slug: 'cataluna',
      name: 'Cataluña',
    },
  },
  provinces: {
    barcelona: {
      slug: 'barcelona',
      name: 'Barcelona',
      regionId: 'catalonia',
      dbName: 'Barcelona',
    },
    girona: {
      slug: 'girona',
      name: 'Girona',
      regionId: 'catalonia',
      dbName: 'Girona',
    },
    lleida: {
      slug: 'lleida',
      name: 'Lleida',
      regionId: 'catalonia',
      dbName: 'Lleida',
    },
    tarragona: {
      slug: 'tarragona',
      name: 'Tarragona',
      regionId: 'catalonia',
      dbName: 'Tarragona',
    },
  },
} as const;

export type RegionId = keyof typeof GEOGRAPHY.regions;
export type DestinationProvinceId = keyof typeof GEOGRAPHY.provinces;
export type Region = (typeof GEOGRAPHY.regions)[RegionId];
export type DestinationProvince = (typeof GEOGRAPHY.provinces)[DestinationProvinceId];

export const REGION_IDS = Object.keys(GEOGRAPHY.regions) as RegionId[];
export const DESTINATION_PROVINCE_IDS = Object.keys(
  GEOGRAPHY.provinces,
) as DestinationProvinceId[];

export function getDestinationPath(
  locale: string,
  regionId: RegionId,
  provinceId: DestinationProvinceId,
): string {
  const region = GEOGRAPHY.regions[regionId];
  const province = GEOGRAPHY.provinces[provinceId];

  return `/${locale}/d/${region.slug}/${province.slug}`;
}

export function buildDestinationAlternateLinks(
  regionId: RegionId,
  provinceId: DestinationProvinceId,
): Record<string, string> {
  const alternates: Record<string, string> = {};

  for (const locale of locales) {
    alternates[locale] = `${BASE_URL}${getDestinationPath(locale, regionId, provinceId)}`;
  }

  alternates['x-default'] = `${BASE_URL}${getDestinationPath('es', regionId, provinceId)}`;

  return alternates;
}

export function getRegionBySlug(slug: string): { id: RegionId; region: Region } | null {
  const regionId = REGION_IDS.find((id) => GEOGRAPHY.regions[id].slug === slug);

  if (!regionId) {
    return null;
  }

  return {
    id: regionId,
    region: GEOGRAPHY.regions[regionId],
  };
}

export function getProvinceBySlug(
  slug: string,
): { id: DestinationProvinceId; province: DestinationProvince } | null {
  const provinceId = DESTINATION_PROVINCE_IDS.find(
    (id) => GEOGRAPHY.provinces[id].slug === slug,
  );

  if (!provinceId) {
    return null;
  }

  return {
    id: provinceId,
    province: GEOGRAPHY.provinces[provinceId],
  };
}

export function getDestinationBySlugs(
  regionSlug: string,
  provinceSlug: string,
):
  | {
      regionId: RegionId;
      provinceId: DestinationProvinceId;
      region: Region;
      province: DestinationProvince;
    }
  | null {
  const regionMatch = getRegionBySlug(regionSlug);
  const provinceMatch = getProvinceBySlug(provinceSlug);

  if (!regionMatch || !provinceMatch) {
    return null;
  }

  if (provinceMatch.province.regionId !== regionMatch.id) {
    return null;
  }

  return {
    regionId: regionMatch.id,
    provinceId: provinceMatch.id,
    region: regionMatch.region,
    province: provinceMatch.province,
  };
}

export function getProvinceByDbName(
  dbName: string,
): { id: DestinationProvinceId; province: DestinationProvince } | null {
  const provinceId = DESTINATION_PROVINCE_IDS.find(
    (id) => GEOGRAPHY.provinces[id].dbName === dbName,
  );

  if (!provinceId) {
    return null;
  }

  return {
    id: provinceId,
    province: GEOGRAPHY.provinces[provinceId],
  };
}
