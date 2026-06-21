import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getRaceAccessContext } from '@/lib/auth/organizer';
import type { RaceRow } from '@/types/race.types';

const RACE_ID = 'race-1';

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
