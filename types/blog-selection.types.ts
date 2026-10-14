import type { RegionId } from '@/lib/geography/destinations';

export type BlogRegionId = Exclude<RegionId, 'andorra' | 'ceuta' | 'melilla'>;
export interface SelectedEvent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  races: Array<{ id: string; name: string | null; city: string; province: string; distanceKm: number; elevationGainM: number | null }>;
}
export interface SelectionContext {
  format: 'regional-selection';
  regionId: BlogRegionId;
  regionName: string;
  events: SelectedEvent[];
}
export interface EventSelectionPage {
  events: SelectedEvent[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface SelectionInput { regionId: string; eventIds: string[] }
