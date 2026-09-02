export type EventUpdateBatchStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type EventUpdateBatchItemStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type EventUpdateBatchItemOutcome = 'drafted' | 'skipped';

export interface EventUpdateBatch {
  id: string;
  status: EventUpdateBatchStatus;
  workflowRunId: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  failureReason: string | null;
}

export interface EventUpdateBatchItem {
  id: string;
  batchId: string;
  eventId: string;
  targetYear: number;
  sourceUrl: string;
  status: EventUpdateBatchItemStatus;
  error: string | null;
  outcome: EventUpdateBatchItemOutcome | null;
  draftId: string | null;
  skipReason: string | null;
  eventName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventUpdateBatchSummary {
  total: number;
  drafted: number;
  skipped: number;
  failed: number;
  pending: number;
  running: number;
}

export interface EventUpdateBatchHistoryEntry {
  batch: EventUpdateBatch;
  summary: EventUpdateBatchSummary;
}

export interface EventUpdateBatchSnapshot extends EventUpdateBatchHistoryEntry {
  items: EventUpdateBatchItem[];
}

export interface EventUpdateBatchRow {
  id: string;
  status: EventUpdateBatchStatus;
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  failure_reason: string | null;
}

export interface EventUpdateBatchItemRow {
  id: string;
  batch_id: string;
  event_id: string;
  target_year: number;
  source_url: string;
  status: EventUpdateBatchItemStatus;
  error: string | null;
  outcome: EventUpdateBatchItemOutcome | null;
  draft_id: string | null;
  skip_reason: string | null;
  events?: { name: string } | Array<{ name: string }> | null;
  created_at: string;
  updated_at: string;
}
