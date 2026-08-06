import type {
  TrailEventDateRange,
  TrailEventLocation,
} from '@/types/event.types';

export interface EventMapPin {
  id: string;
  name: string;
  slug: string;
  dateRange: TrailEventDateRange;
  location: TrailEventLocation;
  distances: Array<{ id: string; distanceKm: number }>;
}

export interface EventMapLocation {
  city: string;
  province: string;
  latitude: number;
  longitude: number;
}

export type EventMapLocationKey = Pick<
  EventMapLocation,
  'city' | 'province'
>;

export interface EventMapLocationsRequest {
  locations: EventMapLocationKey[];
}

export interface EventMapLocationsResult {
  locations: EventMapLocation[];
}

export interface EventMapMarker extends EventMapLocation {
  events: EventMapPin[];
}

export interface MapPageLabels {
  previousEvent: string;
  nextEvent: string;
  eventPageLink: string;
  dateTbd: string;
}
