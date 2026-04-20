import { createAdminClient } from '@/lib/supabase/server';
import type { RaceQueueEntry, RaceQueueRow } from '@/types/race-queue.types';
import { raceQueueRowToEntry } from '@/types/race-queue.types';

export async function getRaceQueue(): Promise<RaceQueueEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('race_queue')
    .select('id, url, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch race queue:', error);
    return [];
  }

  return ((data ?? []) as RaceQueueRow[]).map(raceQueueRowToEntry);
}
