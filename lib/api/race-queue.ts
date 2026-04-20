import type { RaceQueueEntry } from '@/types/race-queue.types';

export async function addRaceToQueue(url: string): Promise<RaceQueueEntry> {
  const response = await fetch('/api/admin/race-queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to add URL to queue');
  }

  return responseData.data as RaceQueueEntry;
}

export async function deleteRaceFromQueue(id: string): Promise<void> {
  const response = await fetch('/api/admin/race-queue', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete entry from queue');
  }
}
