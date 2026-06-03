import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type {
  EventDescriptionBatchSnapshot,
  EventDescriptionDraftResult,
} from '@/types/event-description.types';
import type { TrailEvent } from '@/types/event.types';

export async function generateEventDescriptionDraft(
  eventId: string,
  model: OpenRouterScrapeModelId,
): Promise<EventDescriptionDraftResult> {
  const response = await fetch(`/api/events/${eventId}/description-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error || 'Failed to generate event description',
    );
  }

  return responseData.data;
}

export async function saveEventDescription(
  eventId: string,
  description: string | null,
): Promise<TrailEvent> {
  const response = await fetch(`/api/events/${eventId}/description`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to save event description');
  }

  return responseData.data;
}

export async function startEventDescriptionBatch(input: {
  eventIds: string[];
  model: OpenRouterScrapeModelId;
}): Promise<{ batchId: string; workflowRunId: string }> {
  const response = await fetch('/api/events/description-batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error || 'Failed to start event description batch',
    );
  }

  return responseData.data;
}

export async function getEventDescriptionBatchStatus(
  batchId: string,
): Promise<EventDescriptionBatchSnapshot> {
  const response = await fetch(`/api/events/description-batches/${batchId}`);
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error || 'Failed to fetch event description batch',
    );
  }

  return responseData.data;
}

export async function getEventDescriptionItemResult(
  itemId: string,
): Promise<EventDescriptionDraftResult> {
  const response = await fetch(`/api/events/description-batch-items/${itemId}`);
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error || 'Failed to fetch event description item result',
    );
  }

  return responseData.data;
}
