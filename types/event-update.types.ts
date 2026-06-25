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

export interface EventUpdateBatch {
  id: string;
  status: EventUpdateBatchStatus;
  workflowRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventUpdateBatchItem {
  id: string;
  batchId: string;
  eventId: string;
  targetYear: number;
  sourceUrl: string;
  status: EventUpdateBatchItemStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventUpdateBatchRow {
  id: string;
  status: EventUpdateBatchStatus;
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventUpdateBatchItemRow {
  id: string;
  batch_id: string;
  event_id: string;
  target_year: number;
  source_url: string;
  status: EventUpdateBatchItemStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}
