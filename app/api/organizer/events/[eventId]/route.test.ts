import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createClient: vi.fn(),
  getOrganizerEventContext: vi.fn(),
  updateOrganizerEventWithRaces: vi.fn(),
  revalidateEventRelatedPages: vi.fn(),
  revalidateHomepages: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/auth/organizer', () => ({
  getOrganizerEventContext: mocks.getOrganizerEventContext,
}));
vi.mock('@/lib/services/events', () => ({
  updateOrganizerEventWithRaces: mocks.updateOrganizerEventWithRaces,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidateEventRelatedPages: mocks.revalidateEventRelatedPages,
  revalidateHomepages: mocks.revalidateHomepages,
}));

import { PATCH } from './route';

const EVENT_ID = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const RACE_ID = '4d2d9537-f76b-4b20-8ce8-cf88dd190bd2';
const ORGANIZER_ID = 'organizer-1';
const supabase = {};
const previousDetail = {
  event: {
    id: EVENT_ID,
    name: 'Trail Event',
    slug: 'trail-event',
    websiteUrl: 'https://example.com/event',
    organizerId: ORGANIZER_ID,
    description: 'Previous description',
    heroImageFilename: null,
    updatedAt: null,
  },
  races: [
    {
      id: RACE_ID,
      name: 'Trail Event 21K',
      date: '2027-05-01',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 21,
      elevationGainM: 900,
    },
  ],
  allRaceCount: 1,
  dateRange: { startDate: '2027-05-01', endDate: '2027-05-01' },
  location: {
    city: 'Barcelona',
    province: 'Barcelona',
    groups: [{ province: 'Barcelona', cities: ['Barcelona'] }],
    isMultipleLocations: false,
  },
};
const updatedDetail = {
  ...previousDetail,
  event: {
    ...previousDetail.event,
    name: 'Updated Trail Event',
    description: 'Updated description',
  },
};
const updateBody = {
  mode: 'update-races',
  event: {
    name: 'Updated Trail Event',
    description: 'Updated description',
    websiteUrl: 'https://example.com/event',
  },
  races: [
    {
      id: RACE_ID,
      name: 'Trail Event 21K',
      date: '2027-05-01',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 21,
      elevationGainM: 900,
    },
  ],
};

function request(body: unknown): Request {
  return new Request(`http://localhost/api/organizer/events/${EVENT_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ eventId: EVENT_ID }) };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAuth.mockResolvedValue({ user: { id: 'user-1' }, isAdmin: false });
  mocks.createClient.mockResolvedValue(supabase);
  mocks.getOrganizerEventContext.mockResolvedValue({
    organizerId: ORGANIZER_ID,
    event: previousDetail,
  });
  mocks.updateOrganizerEventWithRaces.mockResolvedValue(updatedDetail);
});

describe('PATCH /api/organizer/events/[eventId]', () => {
  it('requires authentication before ownership lookup', async () => {
    mocks.requireAuth.mockRejectedValue(new AuthError());

    const response = await PATCH(request(updateBody), context);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(mocks.getOrganizerEventContext).not.toHaveBeenCalled();
    expect(mocks.updateOrganizerEventWithRaces).not.toHaveBeenCalled();
  });

  it('requires event ownership before updating', async () => {
    mocks.getOrganizerEventContext.mockResolvedValue(null);

    const response = await PATCH(request(updateBody), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(mocks.updateOrganizerEventWithRaces).not.toHaveBeenCalled();
  });

  it('rejects event edition insertion for organizer updates', async () => {
    const response = await PATCH(
      request({ ...updateBody, mode: 'insert-races' }),
      context,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid mode' });
    expect(mocks.updateOrganizerEventWithRaces).not.toHaveBeenCalled();
  });

  it('updates an owned event and revalidates affected pages', async () => {
    const response = await PATCH(request(updateBody), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: updatedDetail,
    });
    expect(mocks.updateOrganizerEventWithRaces).toHaveBeenCalledWith(
      EVENT_ID,
      ORGANIZER_ID,
      {
        mode: 'update-races',
        event: updateBody.event,
        races: updateBody.races,
      },
    );
    expect(mocks.revalidateHomepages).toHaveBeenCalledOnce();
    expect(mocks.revalidateEventRelatedPages).toHaveBeenNthCalledWith(
      1,
      previousDetail,
    );
    expect(mocks.revalidateEventRelatedPages).toHaveBeenNthCalledWith(
      2,
      updatedDetail,
    );
  });
});
