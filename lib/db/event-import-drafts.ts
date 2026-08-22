import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type { EventImportDraft, EventImportDraftData, EventImportDraftRow } from '@/types/event-import-draft.types';

function toDraft(row: EventImportDraftRow): EventImportDraft {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    batchItemId: row.batch_item_id,
    researchBatchItemId: row.research_batch_item_id,
    status: row.status,
    acceptedEventId: row.accepted_event_id,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEventImportDraft(input: {
  data: EventImportDraftData;
  sourceUrl?: string | null;
  batchItemId?: string | null;
}): Promise<EventImportDraft> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('create_event_import_draft', {
    p_data: input.data,
    p_source_url: input.sourceUrl ?? null,
    p_batch_item_id: input.batchItemId ?? null,
  });
  const id = data && typeof data === 'object' && !Array.isArray(data) ? data.id : null;
  if (error || typeof id !== 'string') {
    if (error?.code === '23505') throw new ValidationError('Draft already exists', 409);
    if (error?.code === 'P0002') throw new ValidationError('Batch item not found', 404);
    console.error('Event import draft create error:', error);
    throw new Error('Failed to save event import draft');
  }
  const draft = await getEventImportDraft(id);
  if (!draft) throw new Error('Failed to save event import draft');
  return draft;
}

export async function getEventImportDraft(id: string): Promise<EventImportDraft | null> {
  const { data, error } = await createAdminClient().from('event_import_drafts').select('*').eq('id', id).maybeSingle();
  if (error) { console.error('Event import draft fetch error:', error); throw new Error('Failed to fetch event import draft'); }
  return data ? toDraft(data as EventImportDraftRow) : null;
}

export async function getEventImportDrafts(): Promise<EventImportDraft[]> {
  const { data, error } = await createAdminClient().from('event_import_drafts').select('*').eq('status', 'draft').order('updated_at', { ascending: false });
  if (error) { console.error('Event import drafts fetch error:', error); throw new Error('Failed to fetch event import drafts'); }
  return (data as EventImportDraftRow[] ?? []).map(toDraft);
}

export async function updateEventImportDraft(id: string, data: EventImportDraftData): Promise<EventImportDraft | null> {
  const { data: row, error } = await createAdminClient().from('event_import_drafts').update({ data, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'draft').select('*').maybeSingle();
  if (error) { console.error('Event import draft update error:', error); throw new Error('Failed to update event import draft'); }
  return row ? toDraft(row as EventImportDraftRow) : null;
}

export async function rejectEventImportDraft(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from('event_import_drafts').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'draft').select('id').maybeSingle();
  if (error) { console.error('Event import draft reject error:', error); throw new Error('Failed to reject event import draft'); }
  return data !== null;
}

export async function acceptEventImportDraft(id: string): Promise<{ eventId: string; eventSlug: string }> {
  const { data, error } = await createAdminClient().rpc('accept_event_import_draft', { p_draft_id: id });
  if (error || !data || typeof data !== 'object' || Array.isArray(data) || typeof data.event_id !== 'string' || typeof data.event_slug !== 'string') {
    if (error?.code === 'P0002') throw new ValidationError('Draft not found', 404);
    if (error?.code === 'P0003') throw new ValidationError('Accepted event not found', 409);
    if (error?.code === 'P0004') throw new ValidationError('Event already exists', 409);
    console.error('Event import draft accept error:', error);
    throw new Error('Failed to accept event import draft');
  }
  return { eventId: data.event_id, eventSlug: data.event_slug };
}
