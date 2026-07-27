import type { TrailEventAgentRaceTier } from '@/types/trail-event-agent.types';

export interface RaceTierRecoveryCandidate {
  raceIndex: number;
  name: string | null;
  date: string | null;
  distanceKm: number;
}

export interface RaceTierRecoveryRace {
  raceIndex: number;
  tiers: TrailEventAgentRaceTier[];
}

export interface RaceTierRecoveryParsed {
  races: RaceTierRecoveryRace[];
}
