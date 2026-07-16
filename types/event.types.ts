export type EventRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  organizer_id: string | null;
  description: string | null;
  hero_image_filename: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EventRaceRow = {
  id: string;
  name: string | null;
  date: string | null;
  distance_km: number;
  elevation_gain_m: number | null;
  city: string;
  province: string;
  map_url?: string | null;
  race_tiers?: EventRaceTierRow[] | null;
};

export interface EventRaceTierRow {
  id?: string;
  ends_at?: string | null;
  price_eur: number | null;
}

export interface EventRaceTier {
  id?: string;
  endsAt: string | null;
  priceEur: number;
}

export interface EventRaceTierWriteInput {
  endsAt: string | null;
  priceEur: number;
}

export interface TrailEvent {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  organizerId: string | null;
  description: string | null;
  heroImageFilename: string | null;
  updatedAt: string | null;
}

export interface TrailEventRace {
  id: string;
  name: string | null;
  date: string | null;
  distanceKm: number;
  elevationGainM: number | null;
  city: string;
  province: string;
  mapUrl?: string | null;
  tiers: EventRaceTier[];
}

export interface TrailEventDateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface TrailEventLocationGroup {
  province: string;
  cities: string[];
}

export interface TrailEventLocation {
  city: string | null;
  province: string | null;
  groups: TrailEventLocationGroup[];
  isMultipleLocations: boolean;
}

export interface TrailEventDetail {
  event: TrailEvent;
  races: TrailEventRace[];
  allRaceCount: number;
  dateRange: TrailEventDateRange;
  location: TrailEventLocation;
}

export interface PublicEventDetail {
  event: Pick<TrailEvent, 'id' | 'name' | 'slug'>;
  races: Array<
    Pick<
      TrailEventRace,
      'id' | 'name' | 'date' | 'distanceKm' | 'elevationGainM' | 'city' | 'province'
    >
  >;
  dateRange: TrailEventDateRange;
  location: TrailEventLocation;
}

export interface AdminTrailEventDetail extends TrailEventDetail {
  pendingDraft: import('@/types/event-draft.types').EventDraft | null;
}

export type EventRaceWithEventIdRow = EventRaceRow & {
  event_id: string;
};

export type EventWithRacesRow = EventRow & {
  races: EventRaceWithEventIdRow[];
};
