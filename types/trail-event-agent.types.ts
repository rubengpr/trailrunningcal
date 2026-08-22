export interface TrailEventAgentEvent {
  name: string;
  description: string | null;
  websiteUrl: string | null;
}

export interface TrailEventAgentRaceTier {
  priceEur: number;
  endsAt: string | null;
}

export interface TrailEventAgentRace {
  name: string | null;
  date: string | null;
  city: string;
  province: string;
  distanceKm: number;
  elevationGainM: number | null;
  // Optional for compatibility with legacy endpoint outputs. The current
  // structured-output schema always asks the research agent to include it.
  gpxDownloadUrl?: string | null;
  tiers: TrailEventAgentRaceTier[];
}

export interface TrailEventAgentParsed {
  event: TrailEventAgentEvent | null;
  races: TrailEventAgentRace[];
  errorMessage: string | null;
}
