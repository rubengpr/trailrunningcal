import type { TrailEventAgentEvent, TrailEventAgentRace } from '@/types/trail-event-agent.types';

export type EventImportDraftStatus = 'draft' | 'accepted' | 'rejected';

export interface EventImportDraftData {
  event: TrailEventAgentEvent;
  races: TrailEventAgentRace[];
}

export interface EventImportDraft {
  id: string;
  sourceUrl: string | null;
  batchItemId: string | null;
  status: EventImportDraftStatus;
  acceptedEventId: string | null;
  data: EventImportDraftData;
  createdAt: string;
  updatedAt: string;
}

export interface EventImportDraftRow {
  id: string;
  source_url: string | null;
  batch_item_id: string | null;
  status: EventImportDraftStatus;
  accepted_event_id: string | null;
  data: EventImportDraftData;
  created_at: string;
  updated_at: string;
}
