import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock('react', () => ({ cache: <T>(callback: T): T => callback }));
vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: () => ({ from: mocks.from }),
}));

import { getEventMapLocations } from './events-map';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
});

describe('getEventMapLocations', () => {
  it('returns city coordinates', async () => {
    mocks.select.mockResolvedValue({
      data: [{
        city: 'Barcelona',
        province: 'Barcelona',
        latitude: 41.38,
        longitude: 2.17,
      }],
      error: null,
    });

    const result = await getEventMapLocations();

    expect(mocks.from).toHaveBeenCalledWith('city_locations');
    expect(mocks.select).toHaveBeenCalledWith(
      'city, province, latitude, longitude',
    );
    expect(result).toEqual([{
      city: 'Barcelona',
      province: 'Barcelona',
      latitude: 41.38,
      longitude: 2.17,
    }]);
  });

  it('returns an empty list when city coordinates cannot be loaded', async () => {
    mocks.select.mockResolvedValue({
      data: null,
      error: { message: 'failed' },
    });

    await expect(getEventMapLocations()).resolves.toEqual([]);
  });
});
