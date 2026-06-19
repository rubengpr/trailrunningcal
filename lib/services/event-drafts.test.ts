import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventImportResult } from '@/types/events-import-api.types';
import type { TrailEventDetail } from '@/types/event.types';
import type {
  EventDraft,
  EventDraftData,
} from '@/types/event-draft.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

const mocks = vi.hoisted(() => ({
  processCrawlSiteExtract: vi.fn(),
  getEventByIdForAdmin: vi.fn(),
  getPendingDraftByEventId: vi.fn(),
  getPendingDraftById: vi.fn(),
  createEventDraft: vi.fn(),
  updateEventDraftData: vi.fn(),
  rejectEventDraft: vi.fn(),
  acceptEventDraft: vi.fn(),
}));

vi.mock('@/lib/services/event-import', () => ({
  processCrawlSiteExtract: mocks.processCrawlSiteExtract,
}));

vi.mock('@/lib/db/events', () => ({
  getEventByIdForAdmin: mocks.getEventByIdForAdmin,
}));

vi.mock('@/lib/db/event-drafts', () => ({
  getPendingDraftByEventId: mocks.getPendingDraftByEventId,
  getPendingDraftById: mocks.getPendingDraftById,
  createEventDraft: mocks.createEventDraft,
  updateEventDraftData: mocks.updateEventDraftData,
  rejectEventDraft: mocks.rejectEventDraft,
  acceptEventDraft: mocks.acceptEventDraft,
}));

import {
  acceptEventDraft,
  generateEventDraft,
  rejectEventDraft,
  updateEventDraft,
} from './event-drafts';

const EVENT_ID = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const DRAFT_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';

function extractedEvent(
  overrides: Partial<TrailEventAgentEvent> = {},
): TrailEventAgentEvent {
  return {
    name: 'Trail Event',
    description: 'Event description',
    websiteUrl: 'https://example.com/event',
    ...overrides,
  };
}

function extractedRace(
  overrides: Partial<TrailEventAgentRace> = {},
): TrailEventAgentRace {
  return {
    name: 'Trail Event - 21K',
    date: '2027-05-01',
    city: 'Barcelona',
    province: 'Barcelona',
    distanceKm: 21,
    elevationGainM: 900,
    ...overrides,
  };
}

function eventDetail(websiteUrl = 'https://example.com/event'): TrailEventDetail {
  return {
    event: {
      id: EVENT_ID,
      name: 'Trail Event',
      slug: 'trail-event',
      websiteUrl,
      organizerId: null,
      description: null,
      heroImageFilename: null,
      updatedAt: null,
    },
    races: [],
    allRaceCount: 0,
    dateRange: {
      startDate: null,
      endDate: null,
    },
    location: {
      city: null,
      province: null,
      groups: [],
      isMultipleLocations: false,
    },
  };
}

function importResult(
  data: Partial<EventImportResult> = {},
): EventImportResult {
  const event = extractedEvent();
  const races = [extractedRace()];

  return {
    workflow: 'crawlSiteExtract',
    url: 'https://example.com/event',
    event,
    races,
    errorMessage: null,
    markdown: 'markdown',
    rawModelOutput: JSON.stringify({ event, races, errorMessage: null }),
    usage: null,
    pageStats: null,
    scrapeUsage: null,
    fallbackUsed: null,
    steps: [],
    ...data,
  };
}

function draft(data: EventDraftData): EventDraft {
  return {
    id: DRAFT_ID,
    eventId: EVENT_ID,
    status: 'pending',
    data,
    createdAt: '2026-06-19T00:00:00.000Z',
    updatedAt: '2026-06-19T00:00:00.000Z',
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('generateEventDraft', () => {
  it('persists successful extraction as a pending draft', async () => {
    const result = importResult();
    const createdDraft = draft({
      event: result.event!,
      races: result.races,
    });
    mocks.getPendingDraftByEventId.mockResolvedValue(null);
    mocks.getEventByIdForAdmin.mockResolvedValue(eventDetail());
    mocks.processCrawlSiteExtract.mockResolvedValue(result);
    mocks.createEventDraft.mockResolvedValue(createdDraft);

    await expect(generateEventDraft(EVENT_ID)).resolves.toEqual(
      createdDraft,
    );

    expect(mocks.processCrawlSiteExtract).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/event',
        skipDuplicateCheck: true,
      }),
    );
    expect(mocks.createEventDraft).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      data: {
        event: result.event,
        races: result.races,
      },
    });
  });

  it('does not run extraction when a pending draft exists', async () => {
    mocks.getPendingDraftByEventId.mockResolvedValue(
      draft({ event: extractedEvent(), races: [extractedRace()] }),
    );

    await expect(generateEventDraft(EVENT_ID)).rejects.toMatchObject({
      status: 409,
    });

    expect(mocks.processCrawlSiteExtract).not.toHaveBeenCalled();
    expect(mocks.createEventDraft).not.toHaveBeenCalled();
  });

  it('does not persist extraction error messages', async () => {
    mocks.getPendingDraftByEventId.mockResolvedValue(null);
    mocks.getEventByIdForAdmin.mockResolvedValue(eventDetail());
    mocks.processCrawlSiteExtract.mockResolvedValue(
      importResult({
        event: null,
        races: [],
        errorMessage: 'La edición está cancelada.',
      }),
    );

    await expect(generateEventDraft(EVENT_ID)).rejects.toMatchObject({
      status: 422,
    });

    expect(mocks.createEventDraft).not.toHaveBeenCalled();
  });

  it('does not persist empty extraction results', async () => {
    mocks.getPendingDraftByEventId.mockResolvedValue(null);
    mocks.getEventByIdForAdmin.mockResolvedValue(eventDetail());
    mocks.processCrawlSiteExtract.mockResolvedValue(
      importResult({
        event: null,
        races: [],
      }),
    );

    await expect(generateEventDraft(EVENT_ID)).rejects.toMatchObject({
      status: 422,
    });

    expect(mocks.createEventDraft).not.toHaveBeenCalled();
  });

  it('rejects an unknown event before extraction', async () => {
    mocks.getPendingDraftByEventId.mockResolvedValue(null);
    mocks.getEventByIdForAdmin.mockResolvedValue(null);

    await expect(generateEventDraft(EVENT_ID)).rejects.toMatchObject({
      status: 404,
    });

    expect(mocks.processCrawlSiteExtract).not.toHaveBeenCalled();
  });

  it('requires an event website before extraction', async () => {
    mocks.getPendingDraftByEventId.mockResolvedValue(null);
    mocks.getEventByIdForAdmin.mockResolvedValue(eventDetail(''));

    await expect(generateEventDraft(EVENT_ID)).rejects.toMatchObject({
      status: 400,
    });

    expect(mocks.processCrawlSiteExtract).not.toHaveBeenCalled();
  });
});

describe('updateEventDraft', () => {
  it('updates and returns the pending draft', async () => {
    const data = { event: extractedEvent(), races: [extractedRace()] };
    const updatedDraft = draft(data);
    mocks.updateEventDraftData.mockResolvedValue(updatedDraft);

    await expect(updateEventDraft(DRAFT_ID, data)).resolves.toEqual(
      updatedDraft,
    );
    expect(mocks.updateEventDraftData).toHaveBeenCalledWith({
      draftId: DRAFT_ID,
      data,
    });
  });
});

describe('rejectEventDraft', () => {
  it('rejects and returns the draft', async () => {
    const rejectedDraft = {
      ...draft({ event: extractedEvent(), races: [extractedRace()] }),
      status: 'rejected' as const,
    };
    mocks.rejectEventDraft.mockResolvedValue(rejectedDraft);

    await expect(rejectEventDraft(DRAFT_ID)).resolves.toEqual(rejectedDraft);
    expect(mocks.rejectEventDraft).toHaveBeenCalledWith(DRAFT_ID);
  });
});

describe('acceptEventDraft', () => {
  it('accepts a pending draft and returns before and after details', async () => {
    const pendingDraft = draft({
      event: extractedEvent(),
      races: [extractedRace()],
    });
    const previousDetail = eventDetail();
    const updatedDetail: TrailEventDetail = {
      ...eventDetail(),
      races: [
        {
          id: '4d2d9537-f76b-4b20-8ce8-cf88dd190bd2',
          name: 'Trail Event - 21K',
          date: '2027-05-01',
          city: 'Barcelona',
          province: 'Barcelona',
          distanceKm: 21,
          elevationGainM: 900,
        },
      ],
      allRaceCount: 1,
    };
    mocks.getPendingDraftById.mockResolvedValue(pendingDraft);
    mocks.getEventByIdForAdmin
      .mockResolvedValueOnce(previousDetail)
      .mockResolvedValueOnce(updatedDetail);
    mocks.acceptEventDraft.mockResolvedValue(EVENT_ID);

    await expect(acceptEventDraft(DRAFT_ID)).resolves.toEqual({
      previousDetail,
      updatedDetail,
    });
    expect(mocks.acceptEventDraft).toHaveBeenCalledWith(DRAFT_ID);
    expect(mocks.getEventByIdForAdmin).toHaveBeenNthCalledWith(1, EVENT_ID);
    expect(mocks.getEventByIdForAdmin).toHaveBeenNthCalledWith(2, EVENT_ID);
  });

  it('rejects a missing pending draft before changing the database', async () => {
    mocks.getPendingDraftById.mockResolvedValue(null);

    await expect(acceptEventDraft(DRAFT_ID)).rejects.toMatchObject({
      status: 404,
    });

    expect(mocks.acceptEventDraft).not.toHaveBeenCalled();
    expect(mocks.getEventByIdForAdmin).not.toHaveBeenCalled();
  });

  it('rejects when the accepted event cannot be reloaded', async () => {
    mocks.getPendingDraftById.mockResolvedValue(
      draft({ event: extractedEvent(), races: [extractedRace()] }),
    );
    mocks.getEventByIdForAdmin
      .mockResolvedValueOnce(eventDetail())
      .mockResolvedValueOnce(null);
    mocks.acceptEventDraft.mockResolvedValue(EVENT_ID);

    await expect(acceptEventDraft(DRAFT_ID)).rejects.toMatchObject({
      status: 404,
    });
  });
});
