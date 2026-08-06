import type { PublicEventDetail } from '@/types/event.types';
import type { EventMapMarker } from '@/types/map.types';
import type { RaceCategorySlug } from '@/lib/races/race-types';

export interface PublicEventFilters {
  months: number[];
  provinces: string[];
  distanceRanges: string[];
  raceTypes: RaceCategorySlug[];
}

export interface PublicEventScope {
  province?: string;
  raceType?: RaceCategorySlug;
}

export interface PublicEventPageRequest {
  page: number;
  referenceDate: string;
  filters: PublicEventFilters;
  scope?: PublicEventScope;
}

export interface PublicEventPage {
  events: PublicEventDetail[];
  markers: EventMapMarker[];
  page: number;
  total: number;
  hasMore: boolean;
  referenceDate: string;
}
