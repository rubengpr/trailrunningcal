import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  adminOrder: vi.fn(),
  getPendingDraftsByEventIds: vi.fn(),
}));

vi.mock('react', () => ({ cache: <T>(callback: T): T => callback }));
vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: () => ({ rpc: mocks.rpc }),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ order: mocks.adminOrder }),
    }),
  }),
}));
vi.mock('@/lib/db/event-drafts', () => ({
  getPendingDraftsByEventIds: mocks.getPendingDraftsByEventIds,
}));

import { getEvents, getEventsForAdmin } from './events';

const EVENT_ID_WITH_DRAFT = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const EVENT_ID_WITHOUT_DRAFT = '94e16324-c0cd-4f29-a43b-d09830c874a2';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('event list visibility', () => {
  it('keeps pending drafts out of the public event list', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          id: EVENT_ID_WITH_DRAFT,
          name: 'Event With Draft',
          slug: 'event-with-draft',
          website_url: 'https://example.com/with-draft',
          organizer_id: null,
          description: null,
          hero_image_filename: null,
          updated_at: null,
          races: [],
        },
        {
          id: EVENT_ID_WITHOUT_DRAFT,
          name: 'Event Without Draft',
          slug: 'event-without-draft',
          website_url: 'https://example.com/without-draft',
          organizer_id: null,
          description: null,
          hero_image_filename: null,
          updated_at: null,
          races: [],
        },
      ],
      error: null,
    });
    const pendingDraft = {
      id: '8e40792f-1a1a-4d30-8d15-ec70a12a04d5',
      eventId: EVENT_ID_WITH_DRAFT,
      status: 'pending' as const,
      data: {
        event: {
          name: 'Event With Draft',
          description: null,
          websiteUrl: 'https://example.com/with-draft',
        },
        races: [
          {
            name: 'Race 21K',
            date: '2027-05-01',
            city: 'Barcelona',
            province: 'Barcelona',
            distanceKm: 21,
            elevationGainM: 900,
          },
        ],
      },
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-19T00:00:00.000Z',
    };
    mocks.getPendingDraftsByEventIds.mockResolvedValue([pendingDraft]);
    mocks.adminOrder.mockResolvedValue({
      data: [
        {
          id: EVENT_ID_WITH_DRAFT,
          name: 'Event With Draft',
          slug: 'event-with-draft',
          website_url: 'https://example.com/with-draft',
          organizer_id: null,
          description: null,
          hero_image_filename: null,
          updated_at: null,
          races: [],
        },
        {
          id: EVENT_ID_WITHOUT_DRAFT,
          name: 'Event Without Draft',
          slug: 'event-without-draft',
          website_url: 'https://example.com/without-draft',
          organizer_id: null,
          description: null,
          hero_image_filename: null,
          updated_at: null,
          races: [],
        },
      ],
      error: null,
    });

    const publicEvents = await getEvents();

    expect(mocks.getPendingDraftsByEventIds).not.toHaveBeenCalled();
    expect(publicEvents).toHaveLength(2);
    expect(publicEvents.every((event) => !('pendingDraft' in event))).toBe(true);

    const result = await getEventsForAdmin();

    expect(mocks.getPendingDraftsByEventIds).toHaveBeenCalledWith([
      EVENT_ID_WITH_DRAFT,
      EVENT_ID_WITHOUT_DRAFT,
    ]);
    expect(result[0].pendingDraft).toEqual(pendingDraft);
    expect(result[1].pendingDraft).toBeNull();
  });
});
