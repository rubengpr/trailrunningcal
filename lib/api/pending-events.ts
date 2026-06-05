import type { PendingEvent } from '@/types/pending-event.types';

export interface SkippedPendingEvent {
  url: string;
  reason: string;
}

export interface AddPendingEventsResult {
  added: PendingEvent[];
  skipped: SkippedPendingEvent[];
}

export async function addPendingEvents(urls: string[]): Promise<AddPendingEventsResult> {
  const response = await fetch('/api/pending-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to add pending events');
  }

  return responseData.data as AddPendingEventsResult;
}

export async function deletePendingEvent(id: string): Promise<void> {
  const response = await fetch(`/api/pending-events/${id}`, {
    method: 'DELETE',
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete pending event');
  }
}
