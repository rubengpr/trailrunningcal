export type RaceQueueStatus = 'pending' | 'done' | 'skipped';

export interface RaceQueueEntry {
  id: string;
  url: string;
  status: RaceQueueStatus;
  createdAt: string;
  updatedAt: string;
}

export type RaceQueueRow = {
  id: string;
  url: string;
  status: RaceQueueStatus;
  created_at: string;
  updated_at: string;
};

export function raceQueueRowToEntry(row: RaceQueueRow): RaceQueueEntry {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
