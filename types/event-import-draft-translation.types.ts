import type { EventTranslationLocale } from '@/types/event-translation.types';

export type EventImportDraftTranslationJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type EventImportDraftTranslationJobItemStatus = EventImportDraftTranslationJobStatus;

export interface EventImportDraftTranslationJob {
  id: string;
  draftId: string;
  sourceDescription: string;
  status: EventImportDraftTranslationJobStatus;
  workflowRunId: string | null;
  acceptedEventId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventImportDraftTranslationJobItem {
  id: string;
  jobId: string;
  locale: EventTranslationLocale;
  status: EventImportDraftTranslationJobItemStatus;
  attempts: number;
  description: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventImportDraftTranslationJobSnapshot {
  job: EventImportDraftTranslationJob;
  items: EventImportDraftTranslationJobItem[];
}

export type EventImportDraftPublication =
  | { status: 'accepted'; eventId: string; eventSlug: string }
  | {
    status: EventImportDraftTranslationJobStatus;
    jobId: string;
  };
