import type { PendingRaceEntry } from '@/types/pending-race.types';

export interface SkippedPendingRace {
  url: string;
  reason: string;
}

export interface AddPendingRacesResult {
  added: PendingRaceEntry[];
  skipped: SkippedPendingRace[];
}

export async function addPendingRaces(urls: string[]): Promise<AddPendingRacesResult> {
  const response = await fetch('/api/pending-races', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to add URLs to pending races');
  }

  return responseData.data as AddPendingRacesResult;
}

export async function deletePendingRace(id: string): Promise<void> {
  const response = await fetch(`/api/pending-races/${id}`, {
    method: 'DELETE',
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete pending race');
  }
}
