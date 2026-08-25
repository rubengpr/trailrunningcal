import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type {
  EventImportDraftPublication,
  EventImportDraftTranslationJob,
  EventImportDraftTranslationJobItem,
  EventImportDraftTranslationJobSnapshot,
  EventImportDraftTranslationJobStatus,
} from '@/types/event-import-draft-translation.types';
import type { EventTranslationLocale } from '@/types/event-translation.types';

type JobRow = {
  id: string;
  draft_id: string;
  source_description: string;
  status: EventImportDraftTranslationJobStatus;
  workflow_run_id: string | null;
  accepted_event_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type JobItemRow = {
  id: string;
  job_id: string;
  locale: EventTranslationLocale;
  status: EventImportDraftTranslationJobStatus;
  attempts: number;
  description: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

function toJob(row: JobRow): EventImportDraftTranslationJob {
  return {
    id: row.id,
    draftId: row.draft_id,
    sourceDescription: row.source_description,
    status: row.status,
    workflowRunId: row.workflow_run_id,
    acceptedEventId: row.accepted_event_id,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toJobItem(row: JobItemRow): EventImportDraftTranslationJobItem {
  return {
    id: row.id,
    jobId: row.job_id,
    locale: row.locale,
    status: row.status,
    attempts: row.attempts,
    description: row.description,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isJobStatus(value: unknown): value is EventImportDraftTranslationJobStatus {
  return value === 'pending' || value === 'running' || value === 'completed' || value === 'failed';
}

export async function createEventImportDraftTranslationJob(draftId: string): Promise<{
  publication: EventImportDraftPublication;
  created: boolean;
}> {
  const { data, error } = await createAdminClient().rpc(
    'create_event_import_draft_translation_job',
    { p_draft_id: draftId },
  );

  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    if (error?.code === 'P0002') throw new ValidationError('Draft not found', 404);
    console.error('Event import draft translation job create error:', error);
    throw new Error('Failed to start draft publication');
  }

  if (
    data.status === 'accepted' &&
    typeof data.event_id === 'string' &&
    typeof data.event_slug === 'string'
  ) {
    return {
      publication: { status: 'accepted', eventId: data.event_id, eventSlug: data.event_slug },
      created: false,
    };
  }

  if (!isJobStatus(data.status) || typeof data.job_id !== 'string' || typeof data.created !== 'boolean') {
    console.error('Invalid event import draft translation job create result:', data);
    throw new Error('Failed to start draft publication');
  }

  return {
    publication: { status: data.status, jobId: data.job_id },
    created: data.created,
  };
}

export async function getEventImportDraftTranslationJob(
  jobId: string,
): Promise<EventImportDraftTranslationJob | null> {
  const { data, error } = await createAdminClient()
    .from('event_import_draft_translation_jobs')
    .select('id, draft_id, source_description, status, workflow_run_id, accepted_event_id, error, created_at, updated_at')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    console.error('Event import draft translation job fetch error:', error);
    throw new Error('Failed to fetch draft publication');
  }

  return data ? toJob(data as JobRow) : null;
}

export async function getEventImportDraftTranslationJobItems(
  jobId: string,
): Promise<EventImportDraftTranslationJobItem[]> {
  const { data, error } = await createAdminClient()
    .from('event_import_draft_translation_job_items')
    .select('id, job_id, locale, status, attempts, description, error, created_at, updated_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Event import draft translation job items fetch error:', error);
    throw new Error('Failed to fetch draft publication');
  }

  return ((data ?? []) as JobItemRow[]).map(toJobItem);
}

export async function getEventImportDraftTranslationJobSnapshot(
  jobId: string,
): Promise<EventImportDraftTranslationJobSnapshot | null> {
  const [job, items] = await Promise.all([
    getEventImportDraftTranslationJob(jobId),
    getEventImportDraftTranslationJobItems(jobId),
  ]);

  return job ? { job, items } : null;
}

export async function getPendingEventImportDraftTranslationJobItems(
  jobId: string,
): Promise<EventImportDraftTranslationJobItem[]> {
  const { data, error } = await createAdminClient()
    .from('event_import_draft_translation_job_items')
    .select('id, job_id, locale, status, attempts, description, error, created_at, updated_at')
    .eq('job_id', jobId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Pending event import draft translation job items fetch error:', error);
    throw new Error('Failed to fetch draft publication items');
  }

  return ((data ?? []) as JobItemRow[]).map(toJobItem);
}

export async function setEventImportDraftTranslationJobWorkflowRunId(input: {
  jobId: string;
  workflowRunId: string;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_import_draft_translation_jobs')
    .update({ workflow_run_id: input.workflowRunId, updated_at: new Date().toISOString() })
    .eq('id', input.jobId);

  if (error) {
    console.error('Event import draft translation workflow id update error:', error);
    throw new Error('Failed to update draft publication');
  }
}

export async function updateEventImportDraftTranslationJobStatus(input: {
  jobId: string;
  status: EventImportDraftTranslationJobStatus;
  error?: string | null;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_import_draft_translation_jobs')
    .update({
      status: input.status,
      error: input.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.jobId);

  if (error) {
    console.error('Event import draft translation job update error:', error);
    throw new Error('Failed to update draft publication');
  }
}

export async function markEventImportDraftTranslationJobItemRunning(itemId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_import_draft_translation_job_items')
    .update({ status: 'running', error: null, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    console.error('Event import draft translation item running update error:', error);
    throw new Error('Failed to update draft publication item');
  }
}

export async function completeEventImportDraftTranslationJobItem(input: {
  itemId: string;
  attempts: number;
  description: string;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_import_draft_translation_job_items')
    .update({
      status: 'completed',
      attempts: input.attempts,
      description: input.description,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.itemId);

  if (error) {
    console.error('Event import draft translation item complete error:', error);
    throw new Error('Failed to complete draft publication item');
  }
}

export async function failEventImportDraftTranslationJobItem(input: {
  itemId: string;
  attempts: number;
  error: string;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from('event_import_draft_translation_job_items')
    .update({
      status: 'failed',
      attempts: input.attempts,
      error: input.error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.itemId);

  if (error) {
    console.error('Event import draft translation item fail error:', error);
    throw new Error('Failed to fail draft publication item');
  }
}

export async function publishEventImportDraftWithTranslations(input: {
  jobId: string;
  translations: Array<{ locale: EventTranslationLocale; description: string }>;
}): Promise<{ eventId: string; eventSlug: string }> {
  const { data, error } = await createAdminClient().rpc(
    'publish_event_import_draft_with_translations',
    {
      p_job_id: input.jobId,
      p_translations: input.translations.map((translation) => ({
        locale: translation.locale,
        description: translation.description,
      })),
    },
  );

  if (
    error ||
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    typeof data.event_id !== 'string' ||
    typeof data.event_slug !== 'string'
  ) {
    console.error('Event import draft publication error:', error);
    throw new Error('Failed to publish draft');
  }

  return { eventId: data.event_id, eventSlug: data.event_slug };
}
