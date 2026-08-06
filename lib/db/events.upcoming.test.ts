import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('react', () => ({ cache: <T>(callback: T): T => callback }));
vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: () => ({ rpc: mocks.rpc }),
  createAdminClient: vi.fn(),
}));
vi.mock('@/lib/db/event-drafts', () => ({
  getPendingDraftsByEventIds: vi.fn(),
}));

import { getUpcomingEventsPage } from '@/lib/db/events';

const request = {
  page: 2,
  referenceDate: '2026-06-22',
  filters: {
    months: [4],
    provinces: ['Barcelona'],
    distanceRanges: ['20-30'],
    raceTypes: ['media-maraton' as const],
  },
  scope: { province: 'Barcelona' },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getUpcomingEventsPage', () => {
  it('calls the RPC and returns public events with page-scoped markers', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        id: 'event-id',
        name: 'Trail Event',
        slug: 'trail-event',
        start_date: '2027-05-01',
        end_date: '2027-05-01',
        total_count: 202,
        races: [{
          event_id: 'event-id',
          id: 'race-id',
          name: 'Trail Event 21K',
          date: '2027-05-01',
          distance_km: 21,
          elevation_gain_m: 900,
          city: 'Barcelona',
          province: 'Barcelona',
          latitude: 41.38,
          longitude: 2.17,
        }],
      }],
      error: null,
    });

    const result = await getUpcomingEventsPage(request);

    expect(mocks.rpc).toHaveBeenCalledWith('get_public_events_page', {
      p_reference_date: '2026-06-22',
      p_offset: 100,
      p_months: [5],
      p_provinces: ['Barcelona'],
      p_distance_ranges: ['20-30'],
      p_race_types: ['media-maraton'],
      p_scope_province: 'Barcelona',
      p_scope_race_type: null,
    });
    expect(result).toMatchObject({
      page: 2,
      total: 202,
      hasMore: true,
      referenceDate: '2026-06-22',
      events: [{
        event: { id: 'event-id', name: 'Trail Event', slug: 'trail-event' },
        dateRange: { startDate: '2027-05-01', endDate: '2027-05-01' },
      }],
      markers: [{
        city: 'Barcelona',
        province: 'Barcelona',
        latitude: 41.38,
        longitude: 2.17,
        events: [{ id: 'event-id' }],
      }],
    });
  });

  it('preserves the total count for an empty later page', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ total_count: 202 }],
        error: null,
      });

    await expect(getUpcomingEventsPage(request)).resolves.toEqual({
      events: [],
      markers: [],
      page: 2,
      total: 202,
      hasMore: false,
      referenceDate: '2026-06-22',
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith('get_public_events_page', {
      p_reference_date: '2026-06-22',
      p_offset: 0,
      p_months: [5],
      p_provinces: ['Barcelona'],
      p_distance_ranges: ['20-30'],
      p_race_types: ['media-maraton'],
      p_scope_province: 'Barcelona',
      p_scope_race_type: null,
    });
  });

  it('throws when the RPC fails', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'failed' },
    });

    await expect(getUpcomingEventsPage(request)).rejects.toThrow(
      'Failed to fetch upcoming event page',
    );
  });
});
