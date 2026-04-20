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
