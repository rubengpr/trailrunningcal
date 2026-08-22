export type CaseType = 'valid-event' | 'out-of-scope' | 'not-found';

export interface EventResearchInput {
  eventName: string;
}

export interface PriceTier {
  priceEur: number;
  endsAt: string | null;
}

export interface TrailRace {
  name: string | null;
  date: string | null;
  city: string;
  province: string;
  distanceKm: number;
  elevationGainM: number | null;
  gpxDownloadUrl?: string | null;
  tiers: PriceTier[];
}

export interface TrailEventOutput {
  event: {
    name: string;
    description: string | null;
    websiteUrl: string | null;
  } | null;
  races: TrailRace[];
  errorMessage: string | null;
}

export interface EventResearchMetadata extends Record<string, unknown> {
  datasetVersion: string;
  inputMode: string;
  verifiedAt: string;
  caseType: CaseType;
}

export type FailureKind =
  | 'api_error'
  | 'incomplete_response'
  | 'parse_error'
  | 'refusal'
  | 'timeout';

export interface EventResearchResult {
  result: unknown;
  failure: FailureKind | null;
  response: {
    id: string;
    model: string;
    status: string;
    searchCallCount: number;
    sources: string[];
  } | null;
}

export interface ResearchProvider {
  research(input: EventResearchInput): Promise<EventResearchResult>;
}
