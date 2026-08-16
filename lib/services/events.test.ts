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
  createEventEdition,
  createEventWithRaces,
  updateEventWithRaces,
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
        endsAt: '2026-12-31',
      },
      { priceEur: 40, endsAt: '2027-03-31' },
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
      ends_at: '2026-12-31',
    },
    { price_eur: 40, ends_at: '2027-03-31' },
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

    expect(mocks.rpc).toHaveBeenCalledWith('create_event_with_results', {
      p_event: {
        name: 'Trail Event',
        description: null,
        website_url: 'https://example.com',
      },
      p_races: [expectedRacePayload],
    });
  });

  it('persists results when creating an event or a new edition', async () => {
    const inputWithResults = {
      ...input,
      races: [{
        ...input.races[0],
        resultsUrl: 'https://results.example.com/21k',
      }],
    };
    const detail = { event: { id: EVENT_ID }, races: [] };
    mocks.getEventByIdForAdmin.mockResolvedValue(detail);

    await createEventWithRaces(inputWithResults);
    await expect(createEventEdition(EVENT_ID, inputWithResults)).resolves.toBe(detail);

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'create_event_with_results', {
      p_event: {
        name: 'Trail Event',
        description: null,
        website_url: 'https://example.com',
      },
      p_races: [{
        ...expectedRacePayload,
        results_url: 'https://results.example.com/21k',
      }],
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      'create_event_edition_with_results',
      expect.objectContaining({
        p_event_id: EVENT_ID,
        p_races: [{
          ...expectedRacePayload,
          results_url: 'https://results.example.com/21k',
        }],
      }),
    );
  });

  it('includes tiers and results when an admin updates an event', async () => {
    const detail = { event: { id: EVENT_ID }, races: [] };
    mocks.getEventByIdForAdmin.mockResolvedValue(detail);

    await expect(
      updateEventWithRaces(EVENT_ID, {
        ...input,
        races: [{
          ...input.races[0],
          id: 'race-1',
          resultsUrl: 'https://results.example.com/21k',
        }],
      }),
    ).resolves.toBe(detail);

    expect(mocks.rpc).toHaveBeenCalledWith('update_event_with_results', {
      p_event_id: EVENT_ID,
      p_event: {
        name: 'Trail Event',
        description: null,
        website_url: 'https://example.com',
      },
      p_races: [{
        ...expectedRacePayload,
        id: 'race-1',
        results_url: 'https://results.example.com/21k',
      }],
    });
  });

  it('includes results when an organizer updates an owned event', async () => {
    const detail = { event: { id: EVENT_ID }, races: [] };
    mocks.getEventByIdForOrganizer.mockResolvedValue(detail);

    await expect(
      updateOrganizerEventWithRaces(EVENT_ID, ORGANIZER_ID, {
        ...input,
        races: [{
          ...input.races[0],
          id: 'race-1',
          resultsUrl: 'https://results.example.com/21k',
        }],
      }),
    ).resolves.toBe(detail);

    expect(mocks.rpc).toHaveBeenCalledWith(
      'update_organizer_event_with_results',
      {
        p_event_id: EVENT_ID,
        p_organizer_id: ORGANIZER_ID,
        p_event: {
          name: 'Trail Event',
          description: null,
          website_url: 'https://example.com',
        },
        p_races: [{
          ...expectedRacePayload,
          id: 'race-1',
          results_url: 'https://results.example.com/21k',
        }],
      },
    );
  });

  it('omits results so older clients preserve the stored value', async () => {
    const detail = { event: { id: EVENT_ID }, races: [] };
    mocks.getEventByIdForAdmin.mockResolvedValue(detail);

    await updateEventWithRaces(EVENT_ID, input);

    expect(mocks.rpc).toHaveBeenCalledWith('update_event_with_results',
      expect.objectContaining({
        p_races: [expectedRacePayload],
      }),
    );
    expect(expectedRacePayload).not.toHaveProperty('results_url');
  });

  it('rejects a non-canonical province before any database write', async () => {
    await expect(createEventWithRaces({
      ...input,
      races: [{ ...input.races[0], province: 'Gerona' }],
    })).rejects.toMatchObject({
      message: 'Invalid province',
      status: 400,
    });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
