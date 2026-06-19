import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  acceptEventDraft: vi.fn(),
  rejectEventDraft: vi.fn(),
  updateEventDraft: vi.fn(),
  revalidateEventRelatedPages: vi.fn(),
  revalidateHomepages: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/event-drafts', () => ({
  acceptEventDraft: mocks.acceptEventDraft,
  rejectEventDraft: mocks.rejectEventDraft,
  updateEventDraft: mocks.updateEventDraft,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidateEventRelatedPages: mocks.revalidateEventRelatedPages,
  revalidateHomepages: mocks.revalidateHomepages,
}));

import { PATCH } from './route';

const DRAFT_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const EVENT_ID = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const draftData = {
  event: {
    name: 'Trail Event',
    description: 'Event description',
    websiteUrl: 'https://example.com/event',
  },
  races: [
    {
      name: 'Trail Event - 21K',
      date: '2027-05-01',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 21,
      elevationGainM: 900,
    },
  ],
};
const pendingDraft = {
  id: DRAFT_ID,
  eventId: EVENT_ID,
  status: 'pending' as const,
  data: draftData,
  createdAt: '2026-06-19T00:00:00.000Z',
  updatedAt: '2026-06-19T00:00:00.000Z',
};
const eventDetail = {
  event: {
    id: EVENT_ID,
    name: 'Trail Event',
    slug: 'trail-event',
    websiteUrl: 'https://example.com/event',
    organizerId: null,
    description: 'Event description',
    heroImageFilename: null,
    updatedAt: null,
  },
  races: [],
  allRaceCount: 0,
  dateRange: { startDate: null, endDate: null },
  location: {
    city: null,
    province: null,
    groups: [],
    isMultipleLocations: false,
  },
};

function request(body: unknown): Request {
  return new Request(`http://localhost/api/events/drafts/${DRAFT_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ draftId: DRAFT_ID }) };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue(undefined);
});

describe('PATCH /api/events/drafts/[draftId]', () => {
  it('requires an admin before dispatching an action', async () => {
    mocks.requireAdmin.mockRejectedValue(new AuthError());

    const response = await PATCH(request({ action: 'reject' }), context);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(mocks.rejectEventDraft).not.toHaveBeenCalled();
  });

  it('dispatches update with validated draft data', async () => {
    mocks.updateEventDraft.mockResolvedValue(pendingDraft);

    const response = await PATCH(
      request({ action: 'update', data: draftData }),
      context,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: pendingDraft,
    });
    expect(mocks.updateEventDraft).toHaveBeenCalledWith(DRAFT_ID, draftData);
  });

  it('dispatches reject', async () => {
    const rejectedDraft = { ...pendingDraft, status: 'rejected' as const };
    mocks.rejectEventDraft.mockResolvedValue(rejectedDraft);

    const response = await PATCH(request({ action: 'reject' }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: rejectedDraft,
    });
    expect(mocks.rejectEventDraft).toHaveBeenCalledWith(DRAFT_ID);
  });

  it('dispatches accept and revalidates affected event pages', async () => {
    const updatedDetail = {
      ...eventDetail,
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
    mocks.acceptEventDraft.mockResolvedValue({
      previousDetail: eventDetail,
      updatedDetail,
    });

    const response = await PATCH(request({ action: 'accept' }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: updatedDetail,
    });
    expect(mocks.acceptEventDraft).toHaveBeenCalledWith(DRAFT_ID);
    expect(mocks.revalidateHomepages).toHaveBeenCalledOnce();
    expect(mocks.revalidateEventRelatedPages).toHaveBeenNthCalledWith(
      1,
      eventDetail,
    );
    expect(mocks.revalidateEventRelatedPages).toHaveBeenNthCalledWith(
      2,
      updatedDetail,
    );
  });
});
