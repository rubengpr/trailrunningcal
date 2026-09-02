import type {
  EventUpdateBatchHistoryEntry,
  EventUpdateBatchSnapshot,
} from '@/types/event-update.types';

export async function getEventUpdateBatchHistory(): Promise<EventUpdateBatchHistoryEntry[]> {
  const response = await fetch('/api/events/updates/batches');
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Failed to fetch update batches');
  return body.data;
}

export async function getEventUpdateBatchStatus(batchId: string): Promise<EventUpdateBatchSnapshot> {
  const response = await fetch(`/api/events/updates/batches/${batchId}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Failed to fetch update batch');
  return body.data;
}
