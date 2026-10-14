import { GEOGRAPHY } from '@/lib/geography/destinations';
import type { BlogRegionId } from '@/types/blog-selection.types';

export const regionIds = (Object.keys(GEOGRAPHY.regions) as Array<keyof typeof GEOGRAPHY.regions>)
  .filter((id): id is BlogRegionId => !['andorra', 'ceuta', 'melilla'].includes(id));

export function isRegion(value: string): value is BlogRegionId {
  return regionIds.includes(value as BlogRegionId);
}
export function provinces(regionId: BlogRegionId): string[] {
  return Object.values(GEOGRAPHY.provinces).filter(province => province.regionId === regionId).map(province => province.dbName);
}
