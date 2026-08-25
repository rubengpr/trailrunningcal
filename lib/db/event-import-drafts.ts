import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type { EventImportDraft, EventImportDraftData, EventImportDraftRow } from '@/types/event-import-draft.types';
import type { EventImportDraftTranslationJobStatus } from '@/types/event-import-draft-translation.types';

function toDraft(
  row: EventImportDraftRow,
  publication: EventImportDraft['publication'] = null,
): EventImportDraft {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    batchItemId: row.batch_item_id,
    researchBatchItemId: row.research_batch_item_id,
    status: row.status,
    acceptedEventId: row.accepted_event_id,
    publication,
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
  const supabase = createAdminClient();
  const [{ data, error }, { data: publications, error: publicationsError }] = await Promise.all([
    supabase.from('event_import_drafts').select('*').eq('status', 'draft').order('updated_at', { ascending: false }),
    supabase
      .from('event_import_draft_translation_jobs')
      .select('id, draft_id, status, error, created_at')
      .order('created_at', { ascending: false }),
  ]);
  if (error) { console.error('Event import drafts fetch error:', error); throw new Error('Failed to fetch event import drafts'); }
  if (publicationsError) { console.error('Event import draft publication fetch error:', publicationsError); throw new Error('Failed to fetch event import drafts'); }
  const publicationByDraftId = new Map<string, EventImportDraft['publication']>();
  for (const publication of publications ?? []) {
    if (publicationByDraftId.has(publication.draft_id)) continue;
    publicationByDraftId.set(publication.draft_id, {
      jobId: publication.id,
      status: publication.status as EventImportDraftTranslationJobStatus,
      error: publication.error,
    });
  }
  return (data as EventImportDraftRow[] ?? []).map((row) =>
    toDraft(row, publicationByDraftId.get(row.id) ?? null),
  );
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
