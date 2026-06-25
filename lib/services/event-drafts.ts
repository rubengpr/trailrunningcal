import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { extractFromMarkdown } from '@/lib/integrations/openrouter/service';
import { processCrawlSiteExtract } from '@/lib/services/event-import';
import { getEventByIdForAdmin } from '@/lib/db/events';
import {
  acceptEventDraft as acceptDraftInDb,
  createEventDraft,
  getPendingDraftById,
  getPendingDraftByEventId,
  rejectEventDraft as rejectDraftInDb,
  updateEventDraftData,
} from '@/lib/db/event-drafts';
import { ValidationError } from '@/lib/errors';
import type { TrailEventDetail } from '@/types/event.types';
import type {
  EventDraft,
  EventDraftData,
} from '@/types/event-draft.types';

export const DEFAULT_EVENT_DRAFT_MODEL =
  OPENROUTER_SCRAPE_MODEL_IDS[0];

async function assertNoPendingDraft(eventId: string): Promise<void> {
  const existingDraft = await getPendingDraftByEventId(eventId);

  if (existingDraft) {
    throw new ValidationError('Event already has a pending draft', 409);
  }
}

function validateExtractedDraftData(input: {
  event: EventDraftData['event'] | null;
  races: EventDraftData['races'];
  errorMessage: string | null;
}): EventDraftData {
  if (input.errorMessage) {
    throw new ValidationError(input.errorMessage, 422);
  }

  if (!input.event || input.races.length === 0) {
    throw new ValidationError('No new edition data found', 422);
  }

  return {
    event: input.event,
    races: input.races,
  };
}

export async function generateEventDraft(
  eventId: string,
): Promise<EventDraft> {
  await assertNoPendingDraft(eventId);

  const eventDetail = await getEventByIdForAdmin(eventId);

  if (!eventDetail) {
    throw new ValidationError('Event not found', 404);
  }

  if (!eventDetail.event.websiteUrl) {
    throw new ValidationError('Event website URL is required', 400);
  }

  const result = await processCrawlSiteExtract({
    url: eventDetail.event.websiteUrl,
    model: DEFAULT_EVENT_DRAFT_MODEL,
    skipDuplicateCheck: true,
  });

  return createEventDraft({
    eventId,
    data: validateExtractedDraftData(result),
  });
}

export async function generateEventDraftFromMarkdown(input: {
  eventId: string;
  markdown: string;
  model?: OpenRouterScrapeModelId;
}): Promise<EventDraft> {
  await assertNoPendingDraft(input.eventId);

  const result = await extractFromMarkdown(
    input.markdown,
    input.model ?? DEFAULT_EVENT_DRAFT_MODEL,
  );

  return createEventDraft({
    eventId: input.eventId,
    data: validateExtractedDraftData(result),
  });
}

export async function updateEventDraft(
  draftId: string,
  data: EventDraftData,
): Promise<EventDraft> {
  return updateEventDraftData({ draftId, data });
}

export async function rejectEventDraft(
  draftId: string,
): Promise<EventDraft> {
  return rejectDraftInDb(draftId);
}

export async function acceptEventDraft(
  draftId: string,
): Promise<{
  previousDetail: TrailEventDetail | null;
  updatedDetail: TrailEventDetail;
}> {
  const draft = await getPendingDraftById(draftId);

  if (!draft) {
    throw new ValidationError('Draft not found', 404);
  }

  const previousDetail = await getEventByIdForAdmin(draft.eventId);
  const acceptedEventId = await acceptDraftInDb(draftId);
  const updatedDetail = await getEventByIdForAdmin(acceptedEventId);

  if (!updatedDetail) {
    throw new ValidationError('Event not found', 404);
  }

  return {
    previousDetail,
    updatedDetail,
  };
}
