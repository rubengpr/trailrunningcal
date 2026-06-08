export interface TrailEventAgentEvent {
  name: string;
  description: string | null;
  websiteUrl: string | null;
}

export interface TrailEventAgentRace {
  name: string | null;
  date: string | null;
  city: string;
  province: string;
  distanceKm: number;
  elevationGainM: number | null;
}

export interface TrailEventAgentParsed {
  event: TrailEventAgentEvent | null;
  races: TrailEventAgentRace[];
  errorMessage: string | null;
}
