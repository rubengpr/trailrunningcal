import type { TrailEventAgentParsed } from '@/types/trail-event-agent.types';

export type EventResearchBatchStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type EventResearchItemStatus = EventResearchBatchStatus;

export type EventResearchFailure =
  | 'api_error'
  | 'incomplete_response'
  | 'parse_error'
  | 'refusal'
  | 'timeout';

export interface EventResearchUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface EventResearchResponse {
  id: string;
  model: string;
  status: string;
  searchCallCount: number;
  sources: string[];
  usage: EventResearchUsage;
}

export interface EventResearchRunResult {
  result: TrailEventAgentParsed | null;
  failure: EventResearchFailure | null;
  response: EventResearchResponse | null;
  braintrustRootSpanId: string;
}

export interface EventResearchBatch {
  id: string;
  status: EventResearchBatchStatus;
  model: string;
  promptSlug: string;
  promptVersion: string;
  searchContextSize: string;
  concurrency: number;
  workflowRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventResearchBatchItem {
  id: string;
  batchId: string;
  eventName: string;
  status: EventResearchItemStatus;
  result: TrailEventAgentParsed | null;
  sources: string[];
  usage: EventResearchUsage | null;
  openAIResponseId: string | null;
  braintrustRootSpanId: string | null;
  raceCount: number | null;
  attemptCount: number;
  error: string | null;
  draftId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventResearchBatchSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface EventResearchBatchSnapshot {
  batch: EventResearchBatch;
  summary: EventResearchBatchSummary;
  items: EventResearchBatchItem[];
}

export interface EventResearchBatchHistoryEntry {
  batch: EventResearchBatch;
  summary: EventResearchBatchSummary;
}

export interface EventResearchBatchRow {
  id: string;
  status: EventResearchBatchStatus;
  model: string;
  prompt_slug: string;
  prompt_version: string;
  search_context_size: string;
  concurrency: number;
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventResearchBatchItemRow {
  id: string;
  batch_id: string;
  event_name: string;
  status: EventResearchItemStatus;
  result: TrailEventAgentParsed | null;
  sources: string[];
  usage: EventResearchUsage | null;
  openai_response_id: string | null;
  braintrust_root_span_id: string | null;
  race_count: number | null;
  attempt_count: number;
  error: string | null;
  draft_id: string | null;
  created_at: string;
  updated_at: string;
}
