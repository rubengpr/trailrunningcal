import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

export type EventDraftStatus = 'pending' | 'accepted' | 'rejected';

export interface EventDraftData {
  event: TrailEventAgentEvent;
  races: TrailEventAgentRace[];
}

export interface EventDraft {
  id: string;
  eventId: string;
  status: EventDraftStatus;
  data: EventDraftData;
  createdAt: string;
  updatedAt: string;
}

export interface EventDraftRow {
  id: string;
  event_id: string;
  status: EventDraftStatus;
  data: EventDraftData;
  created_at: string;
  updated_at: string;
}
