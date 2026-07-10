export interface RaceMapPinRace {
  id: string;
  name: string;
  date: string;
  distanceKm: number;
  elevationGainM: number | null;
  eventSlug: string;
}

export interface RaceMapMarker {
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  races: RaceMapPinRace[];
}

export interface EventsMapResponse {
  markers: RaceMapMarker[];
}

export interface MapPageLabels {
  previousRace: string;
  nextRace: string;
  eventPageLink: string;
  notAvailable: string;
}
