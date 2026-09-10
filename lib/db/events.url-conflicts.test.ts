import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  in: vi.fn(),
}));

vi.mock('react', () => ({ cache: <T>(callback: T): T => callback }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ in: mocks.in }),
    }),
  }),
  createClient: vi.fn(),
  createStaticClient: vi.fn(),
}));
vi.mock('@/lib/db/event-drafts', () => ({
  getPendingDraftsByEventIds: vi.fn(),
}));
vi.mock('@/lib/db/race-tracks', () => ({
  getPublicTrackedRaceIdsForEvent: vi.fn(),
  getTrackedRaceIdsByEventIds: vi.fn(),
}));

import { getEventsByUrl } from './events';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getEventsByUrl', () => {
  it('returns matching events', async () => {
    mocks.in.mockResolvedValue({
      data: [{ id: 'event-1', name: 'Trail Event', website_url: 'https://example.com' }],
      error: null,
    });

    await expect(getEventsByUrl(['https://example.com'])).resolves.toEqual([
      { id: 'event-1', name: 'Trail Event', websiteUrl: 'https://example.com' },
    ]);
  });

  it('fails closed when duplicate detection cannot query the database', async () => {
    mocks.in.mockResolvedValue({ data: null, error: { message: 'unavailable' } });

    await expect(getEventsByUrl(['https://example.com'])).rejects.toThrow(
      'Failed to fetch event URL conflicts',
    );
  });
});
