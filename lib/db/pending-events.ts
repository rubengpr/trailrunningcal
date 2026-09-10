import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type {
  PendingEvent,
  PendingEventRow,
  SkippedUrl,
} from '@/types/pending-event.types';

function toPendingEvent(row: PendingEventRow): PendingEvent {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPendingEvents(): Promise<PendingEvent[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pending_events')
    .select('id, url, status, created_at, updated_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending events:', error);
    return [];
  }

  return ((data ?? []) as PendingEventRow[]).map(toPendingEvent);
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

function isPendingEvent(value: unknown): value is PendingEvent {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.url === 'string' &&
    ['pending', 'done', 'skipped'].includes(String(row.status)) &&
    typeof row.createdAt === 'string' &&
    typeof row.updatedAt === 'string'
  );
}

function isSkippedUrl(value: unknown): value is SkippedUrl {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.url === 'string' && typeof row.reason === 'string';
}

export async function enqueuePendingEvents(urls: string[]): Promise<{
  added: PendingEvent[];
  skipped: SkippedUrl[];
}> {
  if (urls.length === 0) return { added: [], skipped: [] };

  const { data, error } = await createAdminClient().rpc(
    'enqueue_pending_events',
    { p_urls: urls },
  );

  if (error) {
    console.error('Pending event enqueue error:', error);
    throw new Error('Failed to enqueue pending events');
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Invalid pending event enqueue result');
  }

  const result = data as Record<string, unknown>;
  if (
    !Array.isArray(result.added) ||
    !result.added.every(isPendingEvent) ||
    !Array.isArray(result.skipped) ||
    !result.skipped.every(isSkippedUrl)
  ) {
    throw new Error('Invalid pending event enqueue result');
  }

  return { added: result.added, skipped: result.skipped };
}
