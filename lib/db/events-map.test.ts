import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  citySelect: vi.fn(),
  raceSelect: vi.fn(),
  not: vi.fn(),
  gte: vi.fn(),
  order: vi.fn(),
}));

vi.mock('react', () => ({ cache: <T>(callback: T): T => callback }));
vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: () => ({ from: mocks.from }),
}));

import { getEventsMapData } from './events-map';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockImplementation((table: string) => ({
    select: table === 'city_locations' ? mocks.citySelect : mocks.raceSelect,
  }));
  mocks.raceSelect.mockReturnValue({ not: mocks.not });
  mocks.not.mockReturnValue({ gte: mocks.gte });
  mocks.gte.mockReturnValue({ order: mocks.order });
});

describe('getEventsMapData', () => {
  it('maps future races to their parent event slugs', async () => {
    mocks.citySelect.mockResolvedValue({
      data: [{
        city: 'Barcelona',
        province: 'Barcelona',
        latitude: 41.38,
        longitude: 2.17,
      }],
      error: null,
    });
    mocks.order.mockResolvedValue({
      data: [
        {
          id: 'race-1',
          name: 'Trail 21K',
          date: '2027-05-01',
          distance_km: 21,
          elevation_gain_m: 900,
          city: 'Barcelona',
          province: 'Barcelona',
          events: [{ slug: 'trail-event' }],
        },
        {
          id: 'race-without-event',
          name: 'Orphan race',
          date: '2027-05-02',
          distance_km: 10,
          elevation_gain_m: null,
          city: 'Barcelona',
          province: 'Barcelona',
          events: [],
        },
      ],
      error: null,
    });

    const result = await getEventsMapData();

    expect(result).toEqual({
      markers: [{
        city: 'Barcelona',
        province: 'Barcelona',
        latitude: 41.38,
        longitude: 2.17,
        races: [{
          id: 'race-1',
          name: 'Trail 21K',
          date: '2027-05-01',
          distanceKm: 21,
          elevationGainM: 900,
          eventSlug: 'trail-event',
        }],
      }],
    });
  });
});
