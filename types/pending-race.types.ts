export type PendingRaceStatus = 'pending' | 'done' | 'skipped';

export interface PendingRace {
  id: string;
  url: string;
  status: PendingRaceStatus;
  createdAt: string;
  updatedAt: string;
}

export type PendingRaceRow = {
  id: string;
  url: string;
  status: PendingRaceStatus;
  created_at: string;
  updated_at: string;
};
