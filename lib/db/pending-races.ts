import { createAdminClient } from '@/lib/supabase/server';
import type { PendingRaceEntry, PendingRaceRow } from '@/types/pending-race.types';
import { pendingRaceRowToEntry } from '@/types/pending-race.types';

export async function getPendingRaces(): Promise<PendingRaceEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pending_races')
    .select('id, url, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending races:', error);
    return [];
  }

  return ((data ?? []) as PendingRaceRow[]).map(pendingRaceRowToEntry);
}
