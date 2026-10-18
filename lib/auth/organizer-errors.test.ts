import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/db/events', () => ({ getEventByIdForOrganizer: vi.fn() }));

import { getOrganizerEventContext, getOrganizerRaceContext, getRaceAccessContext } from './organizer';

const organizerResult = vi.fn();
const raceResult = vi.fn();
const client = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({ maybeSingle: table === 'organizers' ? organizerResult : raceResult }),
    }),
  }),
} as unknown as SupabaseClient;

beforeEach(() => {
  vi.resetAllMocks();
  organizerResult.mockResolvedValue({ data: { id: 'organizer-1' }, error: null });
});

describe('organizer access lookup failures', () => {
  it('throws on organizer lookup failure instead of denying ownership', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    organizerResult.mockResolvedValue({ data: null, error: { message: 'offline' } });

    await expect(getOrganizerEventContext(client, 'user-1', 'event-1')).rejects.toThrow(
      'Failed to verify organizer access',
    );
  });

  it('returns null when the user has no organizer', async () => {
    organizerResult.mockResolvedValue({ data: null, error: null });

    await expect(getOrganizerEventContext(client, 'user-1', 'event-1')).resolves.toBeNull();
  });

  it.each([false, true])('throws on race lookup failure with admin=%s', async (isAdmin) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    raceResult.mockResolvedValue({ data: null, error: { message: 'offline' } });

    await expect(getRaceAccessContext(client, 'user-1', 'race-1', isAdmin)).rejects.toThrow(
      'Failed to verify race access',
    );
  });

  it('returns null for a missing race', async () => {
    raceResult.mockResolvedValue({ data: null, error: null });

    await expect(getOrganizerRaceContext(client, 'user-1', 'race-1')).resolves.toBeNull();
  });

  it('returns null for a race owned by a different organizer', async () => {
    raceResult.mockResolvedValue({ data: { organizer_id: 'other' }, error: null });

    await expect(getOrganizerRaceContext(client, 'user-1', 'race-1')).resolves.toBeNull();
  });
});
