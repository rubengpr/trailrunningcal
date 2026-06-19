import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
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

export async function generateEventDraft(
  eventId: string,
): Promise<EventDraft> {
  const existingDraft = await getPendingDraftByEventId(eventId);

  if (existingDraft) {
    throw new ValidationError('Event already has a pending draft', 409);
  }

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

  if (result.errorMessage) {
    throw new ValidationError(result.errorMessage, 422);
  }

  if (!result.event || result.races.length === 0) {
    throw new ValidationError('No new edition data found', 422);
  }

  return createEventDraft({
    eventId,
    data: {
      event: result.event,
      races: result.races,
    },
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
