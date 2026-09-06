import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createStaticClient: vi.fn(),
  eventSelect: vi.fn(),
  raceSelect: vi.fn(),
  getEventTranslation: vi.fn(),
  getPublicTrackedRaceIdsForEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  createStaticClient: mocks.createStaticClient,
}));
vi.mock('@/lib/db/event-translations', () => ({
  getEventTranslation: mocks.getEventTranslation,
}));
vi.mock('@/lib/db/race-tracks', () => ({
  getPublicTrackedRaceIdsForEvent: mocks.getPublicTrackedRaceIdsForEvent,
  getTrackedRaceIdsByEventIds: vi.fn(),
}));

import { getEventBySlug } from '@/lib/db/events';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getEventTranslation.mockResolvedValue(null);
  mocks.getPublicTrackedRaceIdsForEvent.mockResolvedValue(['race-1']);
  mocks.eventSelect.mockReturnValue({
    eq: () => ({
      maybeSingle: () => Promise.resolve({
        data: {
          id: 'event-1',
          name: 'Event',
          slug: 'event-track-payload-test',
          website_url: null,
          organizer_id: null,
          description: null,
        },
        error: null,
      }),
    }),
  });
  mocks.raceSelect.mockReturnValue({
    eq: () => Promise.resolve({
      data: [{
        id: 'race-1',
        name: 'Race',
        date: '2027-05-01',
        distance_km: 20,
        elevation_gain_m: 800,
        city: 'Bagà',
        province: 'Barcelona',
        map_url: null,
        results_url: null,
        race_tiers: [],
      }],
      error: null,
    }),
  });
  mocks.createStaticClient.mockReturnValue({
    from: (table: string) => ({
      select: table === 'events' ? mocks.eventSelect : mocks.raceSelect,
    }),
  });
});

describe('getEventBySlug', () => {
  it('loads track IDs separately instead of serializing track geometry', async () => {
    const detail = await getEventBySlug('event-track-payload-test');

    expect(mocks.raceSelect).toHaveBeenCalledWith(
      expect.not.stringContaining('track_geometry'),
    );
    expect(detail?.trackedRaceIds).toEqual(['race-1']);
    expect(detail?.races[0]).not.toHaveProperty('trackGeometry');
  });
});
