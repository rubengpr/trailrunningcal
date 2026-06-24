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

export interface EventUpdateBatchRow {
  id: string;
  status: EventUpdateBatchStatus;
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
}
