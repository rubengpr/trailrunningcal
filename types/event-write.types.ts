import type { EventRaceTierWriteInput } from '@/types/event.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

export type EventRaceWriteInput = Omit<TrailEventAgentRace, 'name'> & {
  name: string | null;
  id?: string;
  resultsUrl?: string | null;
  tiers: EventRaceTierWriteInput[];
};

export interface EventWriteInput {
  event: TrailEventAgentEvent;
  races: EventRaceWriteInput[];
}
