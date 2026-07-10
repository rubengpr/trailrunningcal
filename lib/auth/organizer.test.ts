import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getOrganizerEventContext,
  getRaceAccessContext,
} from '@/lib/auth/organizer';
import type { RaceRow } from '@/types/race.types';

const mocks = vi.hoisted(() => ({
  getEventByIdForOrganizer: vi.fn(),
}));

vi.mock('@/lib/db/events', () => ({
  getEventByIdForOrganizer: mocks.getEventByIdForOrganizer,
}));

const RACE_ID = 'race-1';
const EVENT_ID = 'event-1';
const eventDetail = {
  event: {
    id: EVENT_ID,
    name: 'Trail Event',
    slug: 'trail-event',
    websiteUrl: 'https://example.com',
    organizerId: 'organizer-1',
    description: null,
    heroImageFilename: null,
    updatedAt: null,
  },
  races: [],
  allRaceCount: 0,
  dateRange: { startDate: null, endDate: null },
  location: {
    city: null,
    province: null,
    groups: [],
    isMultipleLocations: false,
  },
};

function raceRow(organizerId: string): RaceRow {
  return {
    id: RACE_ID,
    name: 'Trail Race',
    date: '2027-05-01',
    distance_km: 21,
    elevation_gain_m: 900,
    race_tiers: null,
    city: 'Barcelona',
    province: 'Barcelona',
    description: null,
    organizer_id: organizerId,
    hero_image_filename: 'main-123.webp',
  };
}

function queryResult(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, single };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getRaceAccessContext', () => {
  it('loads an organizer-backed race for an admin client', async () => {
    const raceQuery = queryResult(raceRow('organizer-1'));
    const client = {
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(raceQuery),
    } as unknown as SupabaseClient;

    const result = await getRaceAccessContext(client, RACE_ID, true);

    expect(result?.organizerId).toBe('organizer-1');
    expect(result?.race.id).toBe(RACE_ID);
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });

  it('allows an organizer to access their own race', async () => {
    const organizerQuery = queryResult({ id: 'organizer-1' });
    const raceQuery = queryResult(raceRow('organizer-1'));
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) =>
        table === 'organizers' ? organizerQuery : raceQuery,
      ),
    } as unknown as SupabaseClient;

    const result = await getRaceAccessContext(client, RACE_ID, false);

    expect(result?.organizerId).toBe('organizer-1');
    expect(result?.race.id).toBe(RACE_ID);
  });

  it('rejects a race owned by another organizer', async () => {
    const organizerQuery = queryResult({ id: 'organizer-1' });
    const raceQuery = queryResult(raceRow('organizer-2'));
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) =>
        table === 'organizers' ? organizerQuery : raceQuery,
      ),
    } as unknown as SupabaseClient;

    await expect(
      getRaceAccessContext(client, RACE_ID, false),
    ).resolves.toBeNull();
  });
});

describe('getOrganizerEventContext', () => {
  it('allows an organizer to access their own event', async () => {
    const organizerQuery = queryResult({ id: 'organizer-1' });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(() => organizerQuery),
    } as unknown as SupabaseClient;
    mocks.getEventByIdForOrganizer.mockResolvedValue(eventDetail);

    const result = await getOrganizerEventContext(client, EVENT_ID);

    expect(result).toEqual({
      organizerId: 'organizer-1',
      event: eventDetail,
    });
    expect(mocks.getEventByIdForOrganizer).toHaveBeenCalledWith(
      EVENT_ID,
      'organizer-1',
    );
  });

  it('rejects a missing organizer event', async () => {
    const organizerQuery = queryResult({ id: 'organizer-1' });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(() => organizerQuery),
    } as unknown as SupabaseClient;
    mocks.getEventByIdForOrganizer.mockResolvedValue(null);

    await expect(getOrganizerEventContext(client, EVENT_ID)).resolves.toBeNull();
  });
});
