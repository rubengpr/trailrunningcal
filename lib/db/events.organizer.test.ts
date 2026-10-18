import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseEventInput } from '@/lib/events/write-validation';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  eventSelect: vi.fn(),
  raceSelect: vi.fn(),
  eventResult: vi.fn(),
  raceResult: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
  createAdminClient: vi.fn(),
  createStaticClient: vi.fn(),
}));

import { getEventByIdForOrganizer } from '@/lib/db/events';

const eventId = '11111111-1111-4111-8111-111111111111';
const raceId = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.resetAllMocks();
  const eventQuery = { eq: vi.fn(), single: mocks.eventResult };
  eventQuery.eq.mockReturnValue(eventQuery);
  mocks.eventSelect.mockReturnValue(eventQuery);
  mocks.raceSelect.mockReturnValue({ eq: mocks.raceResult });
  mocks.createClient.mockResolvedValue({
    from: (table: string) => ({
      select: table === 'events' ? mocks.eventSelect : mocks.raceSelect,
    }),
  });
  mocks.eventResult.mockResolvedValue({
    data: { id: eventId, name: 'Trail Event', slug: 'trail-event' },
    error: null,
  });
});

describe('getEventByIdForOrganizer', () => {
  it.each([
    [{ id: 'tier-1', price_eur: 35, ends_at: '2027-01-31' }],
    [
      { id: 'tier-1', price_eur: 35, ends_at: '2027-01-31' },
      { id: 'tier-2', price_eur: 45, ends_at: '2027-03-31' },
    ],
  ])('preserves a dated schedule through the edit payload: %j', async (...tiers) => {
    mocks.raceResult.mockResolvedValue({
      data: [{
        id: raceId,
        name: 'Trail Race',
        date: '2027-05-01',
        distance_km: 20,
        elevation_gain_m: 800,
        city: 'Bagà',
        province: 'Barcelona',
        race_tiers: tiers,
      }],
      error: null,
    });

    const detail = await getEventByIdForOrganizer(eventId, 'organizer-1');

    expect(mocks.raceSelect).toHaveBeenCalledWith(
      expect.stringMatching(/race_tiers\s*\(\s*id,\s*ends_at,\s*price_eur\s*\)/),
    );
    expect(detail).not.toBeNull();
    const input = parseEventInput({ event: detail!.event, races: detail!.races });
    expect(input.races[0].tiers).toEqual(tiers.map((tier) => ({
      priceEur: tier.price_eur,
      endsAt: tier.ends_at,
    })));
  });
});
