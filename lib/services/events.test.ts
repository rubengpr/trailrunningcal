import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  getEventByIdForAdmin: vi.fn(),
  getEventByIdForOrganizer: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: mocks.createAdminClient,
  createClient: mocks.createClient,
}));
vi.mock('@/lib/db/events', () => ({
  getEventByIdForAdmin: mocks.getEventByIdForAdmin,
  getEventByIdForOrganizer: mocks.getEventByIdForOrganizer,
}));

import {
  createEventWithRaces,
  updateOrganizerEventWithRaces,
} from './events';

const EVENT_ID = '7a0a4eb8-e4a4-4e8d-8d0c-1d0ed0e2cf11';
const ORGANIZER_ID = 'organizer-1';
const input = {
  event: {
    name: 'Trail Event',
    description: null,
    websiteUrl: 'https://example.com',
  },
  races: [{
    name: '21K',
    date: '2027-05-30',
    city: 'Barcelona',
    province: 'Barcelona',
    distanceKm: 21,
    elevationGainM: 900,
    tiers: [
      {
        priceEur: 35,
        startsAt: '2026-09-01',
        endsAt: '2026-12-31',
      },
      { priceEur: 40, startsAt: null, endsAt: null },
    ],
  }],
};

const expectedRacePayload = {
  name: '21K',
  date: '2027-05-30',
  city: 'Barcelona',
  province: 'Barcelona',
  distance_km: 21,
  elevation_gain_m: 900,
  tiers: [
    {
      price_eur: 35,
      starts_at: '2026-09-01',
      ends_at: '2026-12-31',
    },
    { price_eur: 40, starts_at: null, ends_at: null },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  const client = { rpc: mocks.rpc };
  mocks.createAdminClient.mockReturnValue(client);
  mocks.createClient.mockResolvedValue(client);
  mocks.rpc.mockResolvedValue({ data: EVENT_ID, error: null });
});

describe('event services race tiers', () => {
  it('includes tiers when creating an event with races', async () => {
    await expect(createEventWithRaces(input)).resolves.toEqual({ id: EVENT_ID });

    expect(mocks.rpc).toHaveBeenCalledWith('create_event_with_races', {
      p_event: {
        name: 'Trail Event',
        description: null,
        website_url: 'https://example.com',
      },
      p_races: [expectedRacePayload],
    });
  });

  it('includes tiers when an organizer updates an owned event', async () => {
    const detail = { event: { id: EVENT_ID }, races: [] };
    mocks.getEventByIdForOrganizer.mockResolvedValue(detail);

    await expect(
      updateOrganizerEventWithRaces(EVENT_ID, ORGANIZER_ID, input),
    ).resolves.toBe(detail);

    expect(mocks.rpc).toHaveBeenCalledWith(
      'update_organizer_event_with_races',
      {
        p_event_id: EVENT_ID,
        p_organizer_id: ORGANIZER_ID,
        p_event: {
          name: 'Trail Event',
          description: null,
          website_url: 'https://example.com',
        },
        p_races: [expectedRacePayload],
      },
    );
  });
});
