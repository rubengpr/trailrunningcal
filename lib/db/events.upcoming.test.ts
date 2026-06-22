import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  gt: vi.fn(),
}));

vi.mock('react', () => ({ cache: <T>(callback: T): T => callback }));
vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: () => ({ from: mocks.from }),
  createAdminClient: vi.fn(),
}));
vi.mock('@/lib/db/event-drafts', () => ({
  getPendingDraftsByEventIds: vi.fn(),
}));

import { getUpcomingEvents } from '@/lib/db/events';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ gt: mocks.gt });
});

describe('getUpcomingEvents', () => {
  it('queries future races and returns the minimal public event shape', async () => {
    mocks.gt.mockResolvedValue({
      data: [{
        id: 'event-id',
        name: 'Trail Event',
        slug: 'trail-event',
        races: [{
          id: 'race-id',
          name: 'Trail Event 21K',
          date: '2027-05-01',
          distance_km: 21,
          elevation_gain_m: 900,
          city: 'Barcelona',
          province: 'Barcelona',
        }],
      }],
      error: null,
    });

    const result = await getUpcomingEvents('2026-06-22');

    expect(mocks.from).toHaveBeenCalledWith('events');
    expect(mocks.gt).toHaveBeenCalledWith('races.date', '2026-06-22');
    expect(result).toEqual([{
      event: { id: 'event-id', name: 'Trail Event', slug: 'trail-event' },
      races: [{
        id: 'race-id',
        name: 'Trail Event 21K',
        date: '2027-05-01',
        distanceKm: 21,
        elevationGainM: 900,
        city: 'Barcelona',
        province: 'Barcelona',
      }],
      dateRange: { startDate: '2027-05-01', endDate: '2027-05-01' },
      location: {
        city: 'Barcelona',
        province: 'Barcelona',
        groups: [{ province: 'Barcelona', cities: ['Barcelona'] }],
        isMultipleLocations: false,
      },
    }]);
  });
});
