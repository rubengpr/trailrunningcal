export type PendingEventStatus = 'pending' | 'done' | 'skipped';

export interface PendingEvent {
  id: string;
  url: string;
  status: PendingEventStatus;
  createdAt: string;
  updatedAt: string;
}

export type SkippedUrl = {
  url: string;
  reason: string;
};

export type PendingEventRow = {
  id: string;
  url: string;
  status: PendingEventStatus;
  created_at: string;
  updated_at: string;
};
