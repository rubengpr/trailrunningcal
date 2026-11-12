import { GEOGRAPHY, getProvinceByDbName, getRegionProvinceIds } from '@/lib/geography/destinations';
import type { RegionId } from '@/lib/geography/destinations';
import { isValidProvince } from '@/lib/geography/provinces';

function values(value?: string | string[]): string[] {
  return typeof value === 'string' ? [value] : value ?? [];
}

export function parseLocationFilters(regionValue?: string | string[], provinceValue?: string | string[]): {
  regions: RegionId[];
  provinces: string[];
} {
  const regions = [...new Set(values(regionValue))].filter(
    (value): value is RegionId => Object.hasOwn(GEOGRAPHY.regions, value),
  );
  const provinces = [...new Set(values(provinceValue))].filter((value) =>
    isValidProvince(value) && (regions.length === 0
      || regions.includes(getProvinceByDbName(value)!.province.regionId)),
  );
  return { regions, provinces };
}

export function getRegionProvinces(region: RegionId): string[] {
  return getRegionProvinceIds(region).map((id) => GEOGRAPHY.provinces[id].dbName);
}

export function getFilterProvinces(regions: RegionId[] = [], provinces: string[] = []): string[] | undefined {
  const normalized = parseLocationFilters(regions, provinces);
  if (normalized.provinces.length > 0) return normalized.provinces;
  return normalized.regions.length > 0
    ? [...new Set(normalized.regions.flatMap(getRegionProvinces))]
    : undefined;
}
