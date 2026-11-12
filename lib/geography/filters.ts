import { GEOGRAPHY, getProvinceByDbName, getRegionProvinceIds } from '@/lib/geography/destinations';
import type { RegionId } from '@/lib/geography/destinations';
import { isValidProvince } from '@/lib/geography/provinces';

export function parseLocationFilters(regionValue?: string, provinceValue?: string): {
  region?: RegionId;
  province?: string;
} {
  const region = regionValue && Object.hasOwn(GEOGRAPHY.regions, regionValue)
    ? regionValue as RegionId
    : undefined;
  const province = isValidProvince(provinceValue)
    && (!region || getProvinceByDbName(provinceValue)?.province.regionId === region)
    ? provinceValue
    : undefined;
  return { region, province };
}

export function getRegionProvinces(region: RegionId): string[] {
  return getRegionProvinceIds(region).map((id) => GEOGRAPHY.provinces[id].dbName);
}
