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

export interface EventMapMarker extends EventMapLocation {
  events: EventMapPin[];
}

export interface MapPageLabels {
  previousEvent: string;
  nextEvent: string;
  eventPageLink: string;
  dateTbd: string;
}
