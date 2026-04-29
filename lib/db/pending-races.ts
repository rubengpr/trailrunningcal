import { createAdminClient } from '@/lib/supabase/server';
import type { PendingRace, PendingRaceRow } from '@/types/pending-race.types';

function toPendingRace(row: PendingRaceRow): PendingRace {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getPendingRaces(): Promise<PendingRace[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pending_races')
    .select('id, url, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending races:', error);
    return [];
  }

  return ((data ?? []) as PendingRaceRow[]).map(toPendingRace);
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

export async function insertPendingRace(supabase: AdminClient, url: string): Promise<PendingRace | null> {
  const { data, error } = await supabase
    .from('pending_races')
    .insert({ url })
    .select('id, url, status, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('Pending race insert error:', error);
    return null;
  }

  return toPendingRace(data as PendingRaceRow);
}
