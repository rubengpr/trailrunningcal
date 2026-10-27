export type CostStage = 'research' | 'writing' | 'evaluation';
export type CallStatus = 'succeeded' | 'incomplete' | 'failed';
export type ResponseObserver = (response: unknown) => Promise<void>;

// One real inference request as reported by the provider. `usage` keeps the original shape.
export interface InferenceCall {
  requestedModel: string;
  model: string | null;
  serviceTier: string | null;
  responseId: string | null;
  responseStatus: string | null;
  usage: unknown;
  searchCalls: number | null;
}

export interface CostTokens {
  input: number;
  cachedInput: number;
  cacheWrite30m: number;
  cacheWrite12h: number;
  output: number;
  reasoning: number;
}

// Rates applied when the call was recorded; later price changes never rewrite them.
export interface AppliedRates {
  version: string;
  source: string;
  currency: 'USD';
  model: string;
  tier: string;
  context: 'short' | 'long';
  inputPerMillion: number;
  cachedInputPerMillion: number;
  cacheWrite30mPerMillion: number;
  cacheWrite12hPerMillion: number;
  outputPerMillion: number;
  searchPerCall: number;
  cacheWriteTtl: 'reported' | 'assumed_30m';
}

export interface CostEstimate {
  tokens: CostTokens;
  searches: number;
  rates: AppliedRates;
  breakdown: Record<'input' | 'cachedInput' | 'cacheWrite30m' | 'cacheWrite12h' | 'output' | 'search', number>;
  costUsd: number;
}

export type CostUnavailable = 'usage_missing' | 'usage_invalid' | 'model_unpriced' | 'tier_unknown';

export interface CostEntry {
  key: string;
  stage: CostStage;
  draftId: string | null;
  researchResultId: string | null;
  evaluationAttemptId: string | null;
  errorCode: string | null;
  call: InferenceCall;
}

export interface CostLine {
  id: string;
  stage: CostStage;
  eventName: string | null;
  attempt: number | null;
  model: string | null;
  status: CallStatus | null;
  tokens: CostTokens | null;
  searches: number | null;
  costUsd: number | null;
}

export interface CostGroup {
  stage: CostStage;
  costUsd: number | null;
  partial: boolean;
  lines: CostLine[];
}

export interface CostSummary {
  costUsd: number | null;
  partial: boolean;
  groups: CostGroup[];
}

// Persisted shape read back for the draft summary.
export interface CostRow {
  id: string;
  stage: CostStage;
  research_result_id: string | null;
  status: CallStatus;
  requested_model: string;
  model: string | null;
  tokens: CostTokens | null;
  search_calls: number | null;
  cost_usd: number | string | null;
  created_at: string;
}
