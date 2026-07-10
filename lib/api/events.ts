import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/integrations/openrouter/scrape-models';
import type {
  ConflictResult,
  MarkdownRejectedResult,
} from '@/lib/api/import-results';
import { parseConflict, parseMarkdownRejected } from '@/lib/api/import-results';
import type {
  EventDescriptionBatchSnapshot,
  EventDescriptionDraftResult,
} from '@/types/event-description.types';
import type {
  EventImportBatchSnapshot,
  EventImportRequest,
  EventImportResult,
} from '@/types/events-import-api.types';
import type { PublicEventDetail, TrailEvent, TrailEventDetail } from '@/types/event.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats } from '@/types/races-scrape-api.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

export type EventRaceWriteInput = Omit<TrailEventAgentRace, 'name'> & {
  name: string | null;
  id?: string;
};

export interface TrailEventAgentRunResult {
  event: TrailEventAgentEvent | null;
  races: TrailEventAgentRace[];
  errorMessage: string | null;
  markdown: string;
  rawModelOutput: string;
  usage: OpenRouterScrapeUsage | null;
  pageStats: PageStats;
}

export type TrailEventAgentRunOptions =
  | { mode: 'markdown'; model: OpenRouterScrapeModelId; markdown: string }
  | { mode: 'images'; model: OpenRouterVisionModelId; images: string[] };

export async function getFavoriteEvents(
  eventIds: string[],
): Promise<PublicEventDetail[]> {
  const response = await fetch('/api/events/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventIds }),
  });
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to fetch favorite events');
  }

  return responseData.data;
}

export async function acceptScrapedEvent(
  event: TrailEventAgentEvent,
  races: EventRaceWriteInput[],
): Promise<{ id: string }> {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, races }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to accept event');
  }

  return responseData.data;
}

export async function updateEvent(
  eventId: string,
  event: TrailEventAgentEvent,
  races: EventRaceWriteInput[],
): Promise<TrailEventDetail> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'update-races', event, races }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to update event');
  }

  return responseData.data;
}

export async function updateOrganizerEvent(
  eventId: string,
  event: TrailEventAgentEvent,
  races: EventRaceWriteInput[],
): Promise<TrailEventDetail> {
  const response = await fetch(`/api/organizer/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'update-races', event, races }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to update event');
  }

  return responseData.data;
}

export async function createEventEdition(
  eventId: string,
  event: TrailEventAgentEvent,
  races: EventRaceWriteInput[],
): Promise<TrailEventDetail> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'insert-races', event, races }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to create event edition');
  }

  return responseData.data;
}

export async function runTrailEventAgent(
  options: TrailEventAgentRunOptions,
): Promise<
  { ok: true; data: TrailEventAgentRunResult } | MarkdownRejectedResult
> {
  const body =
    options.mode === 'markdown'
      ? { markdown: options.markdown, model: options.model }
      : { images: options.images, model: options.model };

  const response = await fetch('/api/events/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const responseData = await response.json();

  const tooLong = parseMarkdownRejected(response.status, responseData);
  if (tooLong) return tooLong;

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to extract event');
  }

  return {
    ok: true,
    data: {
      ...responseData.data,
      markdown: options.mode === 'markdown' ? options.markdown : '',
    },
  };
}

export async function runEventImport(
  options: EventImportRequest,
): Promise<
  { ok: true; data: EventImportResult } | ConflictResult | MarkdownRejectedResult
> {
  const response = await fetch('/api/events/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const responseData = await response.json();

  const conflict = parseConflict(response.status, responseData);
  if (conflict) return conflict;

  const tooLong = parseMarkdownRejected(response.status, responseData);
  if (tooLong) return tooLong;

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to import event');
  }

  return { ok: true, data: responseData.data };
}

export async function startEventImportBatch(options: {
  urls: string[];
  model: OpenRouterScrapeModelId;
}): Promise<
  | { ok: true; data: { batchId: string; workflowRunId: string } }
  | ConflictResult
> {
  const response = await fetch('/api/events/import/batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const responseData = await response.json();

  const conflict = parseConflict(response.status, responseData);
  if (conflict) return conflict;

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to start event import batch');
  }

  return { ok: true, data: responseData.data };
}

export async function getEventImportBatchStatus(
  batchId: string,
): Promise<EventImportBatchSnapshot> {
  const response = await fetch(`/api/events/import/batches/${batchId}`);
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to fetch event import batch');
  }

  return responseData.data;
}

export async function getEventImportItemResult(
  itemId: string,
): Promise<EventImportResult> {
  const response = await fetch(`/api/events/import/batch-items/${itemId}`);
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error || 'Failed to fetch event import item result',
    );
  }

  return responseData.data;
}

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

export async function deleteEvent(eventId: string): Promise<void> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: 'DELETE',
  });
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete event');
  }
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
