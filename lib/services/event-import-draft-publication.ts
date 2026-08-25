import { start } from 'workflow/api';
import {
  completeEventImportDraftTranslationJobItem,
  createEventImportDraftTranslationJob,
  failEventImportDraftTranslationJobItem,
  getEventImportDraftTranslationJob,
  getEventImportDraftTranslationJobSnapshot,
  getPendingEventImportDraftTranslationJobItems,
  markEventImportDraftTranslationJobItemRunning,
  publishEventImportDraftWithTranslations,
  setEventImportDraftTranslationJobWorkflowRunId,
  updateEventImportDraftTranslationJobStatus,
} from '@/lib/db/event-import-draft-translation-jobs';
import {
  generateValidatedEventTranslation,
  MAX_EVENT_TRANSLATION_ATTEMPTS,
} from '@/lib/services/event-translation-generation';
import {
  revalidateEventPages,
  revalidatePublicListingPages,
} from '@/lib/cache/revalidation';
import type {
  EventImportDraftPublication,
  EventImportDraftTranslationJobSnapshot,
} from '@/types/event-import-draft-translation.types';
import type { EventTranslationLocale } from '@/types/event-translation.types';

interface EventImportDraftPublicationWorkflowInput {
  jobId: string;
}

function hasExactlyTwoParagraphs(value: string): boolean {
  return value
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0).length === 2;
}

export async function startEventImportDraftPublication(
  draftId: string,
): Promise<EventImportDraftPublication> {
  const { publication, created } = await createEventImportDraftTranslationJob(draftId);
  if (publication.status === 'accepted' || !created) return publication;

  try {
    const run = await start(eventImportDraftPublicationWorkflow, [{ jobId: publication.jobId }]);
    await setEventImportDraftTranslationJobWorkflowRunId({
      jobId: publication.jobId,
      workflowRunId: run.runId,
    });
    return publication;
  } catch (error) {
    await updateEventImportDraftTranslationJobStatus({
      jobId: publication.jobId,
      status: 'failed',
      error: 'Failed to start draft publication',
    });
    throw error;
  }
}

export async function getEventImportDraftPublicationStatus(
  jobId: string,
): Promise<EventImportDraftTranslationJobSnapshot | null> {
  return getEventImportDraftTranslationJobSnapshot(jobId);
}

async function markJobRunningStep(jobId: string): Promise<void> {
  'use step';

  await updateEventImportDraftTranslationJobStatus({ jobId, status: 'running' });
}

async function getJobStep(jobId: string) {
  'use step';

  const job = await getEventImportDraftTranslationJob(jobId);
  if (!job) throw new Error('Draft publication not found');
  return job;
}

async function getPendingItemsStep(jobId: string) {
  'use step';

  return getPendingEventImportDraftTranslationJobItems(jobId);
}

async function processItemStep(input: {
  itemId: string;
  locale: EventTranslationLocale;
  source: string;
}): Promise<{ locale: EventTranslationLocale; description: string }> {
  'use step';

  await markEventImportDraftTranslationJobItemRunning(input.itemId);
  try {
    const result = await generateValidatedEventTranslation({
      source: input.source,
      locale: input.locale,
    });
    await completeEventImportDraftTranslationJobItem({
      itemId: input.itemId,
      attempts: result.attempts,
      description: result.description,
    });
    return { locale: input.locale, description: result.description };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown translation error';
    await failEventImportDraftTranslationJobItem({
      itemId: input.itemId,
      attempts: MAX_EVENT_TRANSLATION_ATTEMPTS,
      error: message,
    });
    throw error;
  }
}

async function publishStep(input: {
  jobId: string;
  translations: Array<{ locale: EventTranslationLocale; description: string }>;
}): Promise<{ eventId: string; eventSlug: string }> {
  'use step';

  return publishEventImportDraftWithTranslations(input);
}

async function revalidatePublishedEventStep(slug: string): Promise<void> {
  'use step';

  revalidatePublicListingPages();
  revalidateEventPages(slug);
}

async function failJobStep(jobId: string, error: string): Promise<void> {
  'use step';

  await updateEventImportDraftTranslationJobStatus({ jobId, status: 'failed', error });
}

export async function eventImportDraftPublicationWorkflow(
  input: EventImportDraftPublicationWorkflowInput,
): Promise<void> {
  'use workflow';

  try {
    await markJobRunningStep(input.jobId);
    const job = await getJobStep(input.jobId);

    if (!job.sourceDescription || !hasExactlyTwoParagraphs(job.sourceDescription)) {
      throw new Error('Spanish description must contain exactly two paragraphs');
    }

    const items = await getPendingItemsStep(input.jobId);
    if (items.length !== 3) throw new Error('Draft publication translations are incomplete');

    const translations: Array<{ locale: EventTranslationLocale; description: string }> = [];
    for (const item of items) {
      translations.push(await processItemStep({
        itemId: item.id,
        locale: item.locale,
        source: job.sourceDescription,
      }));
    }

    const published = await publishStep({ jobId: input.jobId, translations });
    try {
      await revalidatePublishedEventStep(published.eventSlug);
    } catch (error) {
      console.error('Failed to revalidate published event', {
        jobId: input.jobId,
        slug: published.eventSlug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Draft publication failed';
    console.error('Event import draft publication failed', { jobId: input.jobId, error: message });
    await failJobStep(input.jobId, message);
    throw error;
  }
}
