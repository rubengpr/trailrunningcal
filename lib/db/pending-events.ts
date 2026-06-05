import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type { PendingEvent, PendingEventRow } from '@/types/pending-event.types';

function toPendingEvent(row: PendingEventRow): PendingEvent {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getPendingEvents(): Promise<PendingEvent[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pending_events')
    .select('id, url, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending events:', error);
    return [];
  }

  return ((data ?? []) as PendingEventRow[]).map(toPendingEvent);
}

export async function isUrlInEvents(
  supabase: AdminClient,
  url: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('website_url', url)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function isUrlInPendingEvents(
  supabase: AdminClient,
  url: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('pending_events')
    .select('id')
    .eq('url', url)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function deletePendingEvent(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pending_events')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Pending event delete error:', error);
    throw new Error('Failed to delete pending event');
  }

  if (!data) {
    throw new ValidationError('Pending event not found', 404);
  }
}

export async function insertPendingEvent(
  supabase: AdminClient,
  url: string,
): Promise<PendingEvent | null> {
  const { data, error } = await supabase
    .from('pending_events')
    .insert({ url })
    .select('id, url, status, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('Pending event insert error:', error);
    return null;
  }

  return toPendingEvent(data as PendingEventRow);
}
