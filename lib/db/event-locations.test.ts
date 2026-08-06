import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createStaticClient: () => ({ rpc: mocks.rpc }),
}));

import { getPublicEventLocations } from './event-locations';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getPublicEventLocations', () => {
  it('skips the database for an empty request', async () => {
    await expect(getPublicEventLocations([])).resolves.toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('calls the location RPC and returns coordinates', async () => {
    const locations = [{
      city: 'Girona',
      province: 'Girona',
      latitude: 41.98,
      longitude: 2.82,
    }];
    mocks.rpc.mockResolvedValue({ data: locations, error: null });

    await expect(getPublicEventLocations([
      { city: 'Girona', province: 'Girona' },
    ])).resolves.toEqual(locations);
    expect(mocks.rpc).toHaveBeenCalledWith('get_public_event_locations', {
      p_locations: [{ city: 'Girona', province: 'Girona' }],
    });
  });

  it('surfaces database failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'failed' } });

    await expect(getPublicEventLocations([
      { city: 'Girona', province: 'Girona' },
    ])).rejects.toThrow('Failed to fetch public event locations');
  });
});
