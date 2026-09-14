import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type {
  EventImportDraft,
  EventImportDraftData,
  EventImportDraftPage,
  EventImportDraftPageRequest,
  EventImportDraftRow,
} from '@/types/event-import-draft.types';
import type { EventImportDraftTranslationJobStatus } from '@/types/event-import-draft-translation.types';
import { EVENT_IMPORT_DRAFTS_PAGE_SIZE } from '@/lib/event-import/draft-pagination';

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

type DraftPageIndex = {
  draft_ids: string[];
  total_count: number;
  publications: Array<{
    id: string;
    draft_id: string;
    status: EventImportDraftTranslationJobStatus;
    error: string | null;
  }>;
};

export async function getEventImportDraftsPage(
  input: EventImportDraftPageRequest,
): Promise<EventImportDraftPage> {
  const supabase = createAdminClient();
  const { data: indexData, error: indexError } = await supabase.rpc(
    'get_event_import_drafts_page',
    {
      p_limit: EVENT_IMPORT_DRAFTS_PAGE_SIZE,
      p_offset: (input.page - 1) * EVENT_IMPORT_DRAFTS_PAGE_SIZE,
      p_search: input.search || null,
      p_draft_id: input.draftId,
    },
  );

  if (indexError || !indexData?.[0]) {
    console.error('Event import drafts page index error:', indexError);
    throw new Error('Failed to fetch event import drafts');
  }

  const index = indexData[0] as DraftPageIndex;
  const total = Number(index.total_count);
  if (!Number.isSafeInteger(total) || total < 0) {
    console.error('Invalid event import draft total:', index.total_count);
    throw new Error('Failed to fetch event import drafts');
  }

  const draftIds = index.draft_ids;
  if (draftIds.length === 0) {
    return {
      drafts: [],
      page: input.page,
      pageSize: EVENT_IMPORT_DRAFTS_PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / EVENT_IMPORT_DRAFTS_PAGE_SIZE),
    };
  }

  const { data, error } = await supabase
    .from('event_import_drafts')
    .select('id, source_url, batch_item_id, research_batch_item_id, status, accepted_event_id, data, created_at, updated_at')
    .in('id', draftIds);
  if (error || !data) {
    console.error('Event import drafts fetch error:', error);
    throw new Error('Failed to fetch event import drafts');
  }

  const publicationByDraftId = new Map<string, EventImportDraft['publication']>();
  for (const publication of index.publications) {
    publicationByDraftId.set(publication.draft_id, {
      jobId: publication.id,
      status: publication.status,
      error: publication.error,
    });
  }
  const draftById = new Map(
    (data as EventImportDraftRow[]).map((row) => [
      row.id,
      toDraft(row, publicationByDraftId.get(row.id) ?? null),
    ]),
  );

  return {
    drafts: draftIds.flatMap((id) => {
      const draft = draftById.get(id);
      return draft ? [draft] : [];
    }),
    page: input.page,
    pageSize: EVENT_IMPORT_DRAFTS_PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / EVENT_IMPORT_DRAFTS_PAGE_SIZE),
  };
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
