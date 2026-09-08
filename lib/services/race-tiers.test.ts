import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getEventSlugForRace: vi.fn(),
  revalidateEventPages: vi.fn(),
  revalidateHomepages: vi.fn(),
  updateTierPrice: vi.fn(),
}));

vi.mock('@/lib/cache/revalidation', () => ({
  revalidateEventPages: mocks.revalidateEventPages,
  revalidateHomepages: mocks.revalidateHomepages,
}));
vi.mock('@/lib/db/races', () => ({ getEventSlugForRace: mocks.getEventSlugForRace }));
vi.mock('@/lib/db/race-tiers', () => ({ updateTierPrice: mocks.updateTierPrice }));

import { updateRaceTier } from './race-tiers';

const RACE_ID = '5cd34b8e-8803-4b2d-bbae-8c7ba2a0a9ba';

describe('updateRaceTier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateTierPrice.mockResolvedValue([{ price_eur: 35 }]);
  });

  it('updates the tier and revalidates its event pages', async () => {
    mocks.getEventSlugForRace.mockResolvedValue('trail-running-cal');

    await expect(updateRaceTier(RACE_ID, 35, false)).resolves.toEqual([
      { price_eur: 35 },
    ]);
    expect(mocks.updateTierPrice).toHaveBeenCalledWith(RACE_ID, 35, false);
    expect(mocks.revalidateHomepages).toHaveBeenCalledOnce();
    expect(mocks.getEventSlugForRace).toHaveBeenCalledWith(RACE_ID, false);
    expect(mocks.revalidateEventPages).toHaveBeenCalledWith('trail-running-cal');
  });

  it('still revalidates homepages when the race has no event slug', async () => {
    mocks.getEventSlugForRace.mockResolvedValue(null);

    await updateRaceTier(RACE_ID, null, true);

    expect(mocks.revalidateHomepages).toHaveBeenCalledOnce();
    expect(mocks.revalidateEventPages).not.toHaveBeenCalled();
  });
});
