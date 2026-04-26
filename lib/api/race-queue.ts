import type { RaceQueueEntry } from '@/types/race-queue.types';

export interface SkippedQueueEntry {
  url: string;
  reason: string;
}

export interface AddRacesToQueueResult {
  added: RaceQueueEntry[];
  skipped: SkippedQueueEntry[];
}

export async function addRacesToQueue(urls: string[]): Promise<AddRacesToQueueResult> {
  const response = await fetch('/api/race-queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to add URLs to queue');
  }

  return responseData.data as AddRacesToQueueResult;
}

export async function deleteRaceFromQueue(id: string): Promise<void> {
  const response = await fetch(`/api/race-queue/${id}`, {
    method: 'DELETE',
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete entry from queue');
  }
}
