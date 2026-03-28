export interface RaceMapPinRace {
  id: string;
  name: string;
  date: string;
  distanceKm: number;
  elevationGainM: number | null;
  pathSegment: string;
}

export interface RaceMapMarker {
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  races: RaceMapPinRace[];
}

export interface RacesMapResponse {
  markers: RaceMapMarker[];
}

export interface MapPageLabels {
  previousRace: string;
  nextRace: string;
  racePageLink: string;
  notAvailable: string;
}
