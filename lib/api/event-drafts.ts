import type { TrailEventDetail } from '@/types/event.types';
import type {
  EventDraft,
  EventDraftData,
} from '@/types/event-draft.types';

export async function generateEventDraft(
  eventId: string,
): Promise<EventDraft> {
  const response = await fetch(`/api/events/${eventId}/drafts`, {
    method: 'POST',
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to generate draft');
  }

  return responseData.data;
}

export async function updateEventDraft(
  draftId: string,
  data: EventDraftData,
): Promise<EventDraft> {
  const response = await fetch(`/api/events/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', data }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to update draft');
  }

  return responseData.data;
}

export async function acceptEventDraft(
  draftId: string,
): Promise<TrailEventDetail> {
  const response = await fetch(`/api/events/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'accept' }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to accept draft');
  }

  return responseData.data;
}

export async function rejectEventDraft(
  draftId: string,
): Promise<EventDraft> {
  const response = await fetch(`/api/events/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reject' }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to reject draft');
  }

  return responseData.data;
}
