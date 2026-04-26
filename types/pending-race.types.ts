export type PendingRaceStatus = 'pending' | 'done' | 'skipped';

export interface PendingRaceEntry {
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

export function pendingRaceRowToEntry(row: PendingRaceRow): PendingRaceEntry {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
