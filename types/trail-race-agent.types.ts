export interface TrailRace {
  name: string;
  date: string;
  city: string;
  province: string;
  description: string;
  distanceKm: number;
  elevationGainM: number | null;
}

export interface TrailRaceAgentParsed {
  races: TrailRace[];
  errorMessage: string | null;
}
