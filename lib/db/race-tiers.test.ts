import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: mocks.createAdminClient,
  createClient: mocks.createClient,
}));

import { updateTierPrice } from './race-tiers';

const RACE_ID = '5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba';
const TIER_ID = 'e64908d5-4a4e-44c5-9eff-9a7ce3b7ee55';

describe('updateTierPrice', () => {
  const maybeSingle = vi.fn();
  const select = vi.fn();
  const tierIdFilter = vi.fn();
  const raceIdFilter = vi.fn();
  const update = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: TIER_ID, price_eur: 35 }, error: null });
    select.mockReturnValue({ maybeSingle });
    tierIdFilter.mockReturnValue({ select });
    raceIdFilter.mockReturnValue({ eq: tierIdFilter });
    update.mockReturnValue({ eq: raceIdFilter });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });
  });

  it('updates only the requested tier within the race', async () => {
    await expect(updateTierPrice(RACE_ID, TIER_ID, 35, true)).resolves.toEqual({
      id: TIER_ID,
      price_eur: 35,
    });

    expect(raceIdFilter).toHaveBeenCalledWith('race_id', RACE_ID);
    expect(tierIdFilter).toHaveBeenCalledWith('id', TIER_ID);
  });
});
