import { createAdminClient } from '@/lib/supabase/server';
import type { PendingRaceEntry, PendingRaceRow } from '@/types/pending-race.types';
import { pendingRaceRowToEntry } from '@/types/pending-race.types';

type AdminClient = ReturnType<typeof createAdminClient>;

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

export async function isUrlInRaces(supabase: AdminClient, url: string): Promise<boolean> {
  const { data, error } = await supabase.from('races').select('id').eq('website_url', url).maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function isUrlInPendingRaces(supabase: AdminClient, url: string): Promise<boolean> {
  const { data, error } = await supabase.from('pending_races').select('id').eq('url', url).maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function insertPendingRace(supabase: AdminClient, url: string): Promise<PendingRaceEntry | null> {
  const { data, error } = await supabase
    .from('pending_races')
    .insert({ url })
    .select('id, url, status, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('Pending race insert error:', error);
    return null;
  }

  return pendingRaceRowToEntry(data as PendingRaceRow);
}
