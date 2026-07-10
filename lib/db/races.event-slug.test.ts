import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: mocks.createAdminClient,
  createClient: mocks.createClient,
}));

import { getEventSlugForRace } from './races';

const client = { from: mocks.from };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createAdminClient.mockReturnValue(client);
  mocks.createClient.mockResolvedValue(client);
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ single: mocks.single });
});

describe('getEventSlugForRace', () => {
  it('returns the joined event slug for an authenticated caller', async () => {
    mocks.single.mockResolvedValue({
      data: { events: [{ slug: 'trail-event' }] },
      error: null,
    });

    await expect(getEventSlugForRace('race-1', false)).resolves.toBe('trail-event');
    expect(mocks.createClient).toHaveBeenCalledOnce();
    expect(mocks.select).toHaveBeenCalledWith('events ( slug )');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'race-1');
  });

  it('uses the admin client and returns null when the relation is missing', async () => {
    mocks.single.mockResolvedValue({ data: { events: [] }, error: null });

    await expect(getEventSlugForRace('race-1', true)).resolves.toBeNull();
    expect(mocks.createAdminClient).toHaveBeenCalledOnce();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
