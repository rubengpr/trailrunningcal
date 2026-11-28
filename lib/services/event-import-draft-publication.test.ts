import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  createJob: vi.fn(),
  getJob: vi.fn(),
  getSnapshot: vi.fn(),
  getPendingItems: vi.fn(),
  markRunning: vi.fn(),
  completeItem: vi.fn(),
  failItem: vi.fn(),
  publish: vi.fn(),
  claimJob: vi.fn(),
  retryDispatch: vi.fn(),
  failJob: vi.fn(),
  generateTranslation: vi.fn(),
  revalidateEvent: vi.fn(),
  revalidateListings: vi.fn(),
}));

vi.mock('workflow/api', () => ({ start: mocks.start }));
vi.mock('workflow', () => ({ getWorkflowMetadata: () => ({ workflowRunId: 'workflow-1' }) }));
vi.mock('@/lib/db/event-import-draft-translation-jobs', () => ({
  completeEventImportDraftTranslationJobItem: mocks.completeItem,
  createEventImportDraftTranslationJob: mocks.createJob,
  failEventImportDraftTranslationJobItem: mocks.failItem,
  getEventImportDraftTranslationJob: mocks.getJob,
  getEventImportDraftTranslationJobSnapshot: mocks.getSnapshot,
  getPendingEventImportDraftTranslationJobItems: mocks.getPendingItems,
  markEventImportDraftTranslationJobItemRunning: mocks.markRunning,
  publishEventImportDraftWithTranslations: mocks.publish,
  claimPublicationJob: mocks.claimJob,
  retryPendingPublicationDispatch: mocks.retryDispatch,
  failPublicationJob: mocks.failJob,
}));
vi.mock('@/lib/services/event-translation-generation', () => ({
  MAX_EVENT_TRANSLATION_ATTEMPTS: 3,
  generateValidatedEventTranslation: mocks.generateTranslation,
}));
vi.mock('@/lib/cache/revalidation', () => ({
  revalidateEventPages: mocks.revalidateEvent,
  revalidatePublicListingPages: mocks.revalidateListings,
}));

import {
  eventImportDraftPublicationWorkflow,
  getEventImportDraftPublicationStatus,
  startEventImportDraftPublication,
} from './event-import-draft-publication';

const source = 'La prueba se celebra el 4 de octubre de 2026. Tiene 12 kilómetros.\n\nLa organización ofrece avituallamientos para los participantes.';
const items = ['ca', 'en', 'fr'].map((locale, index) => ({
  id: `item-${locale}`,
  locale,
  status: 'pending',
  jobId: 'job-1',
  attempts: 0,
  description: null,
  error: null,
  createdAt: String(index),
  updatedAt: String(index),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.claimJob.mockResolvedValue(true);
  mocks.getJob.mockResolvedValue({
    id: 'job-1',
    draftId: 'draft-1',
    sourceDescription: source,
    status: 'running',
    workflowRunId: 'workflow-1',
    acceptedEventId: null,
    error: null,
    createdAt: '',
    updatedAt: '',
  });
  mocks.getPendingItems.mockResolvedValue(items);
  mocks.generateTranslation.mockImplementation(({ locale }) => Promise.resolve({
    description: `Translation ${locale}`,
    attempts: 1,
  }));
  mocks.publish.mockResolvedValue({ eventId: 'event-1', eventSlug: 'trail-1' });
});

describe('startEventImportDraftPublication', () => {
  it('starts a workflow once for a new publication job', async () => {
    mocks.createJob.mockResolvedValue({
      publication: { status: 'pending', jobId: 'job-1' },
      created: true,
    });
    mocks.start.mockResolvedValue({ runId: 'workflow-1' });

    await expect(startEventImportDraftPublication('draft-1')).resolves.toEqual({
      status: 'pending',
      jobId: 'job-1',
    });

    expect(mocks.start).toHaveBeenCalledOnce();
    expect(mocks.retryDispatch).not.toHaveBeenCalled();
  });

  it('does not start a duplicate workflow for an active job', async () => {
    mocks.createJob.mockResolvedValue({
      publication: { status: 'running', jobId: 'job-1' },
      created: false,
    });

    await expect(startEventImportDraftPublication('draft-1')).resolves.toEqual({
      status: 'running',
      jobId: 'job-1',
    });

    expect(mocks.start).not.toHaveBeenCalled();
  });

  it('re-dispatches an orphaned pending job once across simultaneous requests', async () => {
    mocks.createJob.mockResolvedValue({
      publication: { status: 'pending', jobId: 'job-1' },
      created: false,
    });
    mocks.retryDispatch.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await Promise.all([
      startEventImportDraftPublication('draft-1'),
      startEventImportDraftPublication('draft-1'),
    ]);

    expect(mocks.retryDispatch).toHaveBeenCalledTimes(2);
    expect(mocks.retryDispatch).toHaveBeenCalledWith('job-1', expect.any(String));
    expect(mocks.start).toHaveBeenCalledExactlyOnceWith(
      eventImportDraftPublicationWorkflow, [{ jobId: 'job-1' }],
    );
  });

  it('leaves a job recoverable when dispatch reports an error', async () => {
    mocks.createJob.mockResolvedValue({
      publication: { status: 'pending', jobId: 'job-1' },
      created: true,
    });
    mocks.start.mockRejectedValue(new Error('dispatch failed'));

    await expect(startEventImportDraftPublication('draft-1')).rejects.toThrow('dispatch failed');
    expect(mocks.failJob).not.toHaveBeenCalled();
  });
});

describe('getEventImportDraftPublicationStatus', () => {
  it.each([
    ['pending', 61_000, true],
    ['pending', 5_000, false],
    ['running', 61_000, false],
  ])('returns retry eligibility for a %s job updated %i ms ago', async (status, elapsed, canRetry) => {
    mocks.getSnapshot.mockResolvedValue({
      job: { status, updatedAt: new Date(Date.now() - elapsed).toISOString() },
      items: [],
    });

    await expect(getEventImportDraftPublicationStatus('job-1')).resolves.toMatchObject({ canRetry });
  });
});

describe('eventImportDraftPublicationWorkflow', () => {
  it('exits without processing when a different workflow claimed the job', async () => {
    mocks.claimJob.mockResolvedValue(false);

    await eventImportDraftPublicationWorkflow({ jobId: 'job-1' });

    expect(mocks.claimJob).toHaveBeenCalledWith('job-1', 'workflow-1');
    expect(mocks.generateTranslation).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('starts all translations concurrently and waits for the slowest before publishing', async () => {
    const pending = new Map<string, (value: { description: string; attempts: number }) => void>();
    mocks.generateTranslation.mockImplementation(({ locale }: { locale: string }) => new Promise((resolve) => {
      pending.set(locale, resolve);
    }));

    const publication = eventImportDraftPublicationWorkflow({ jobId: 'job-1' });

    await vi.waitFor(() => expect([...pending.keys()]).toEqual(['ca', 'en', 'fr']));
    expect(mocks.publish).not.toHaveBeenCalled();

    pending.get('fr')!({ description: 'Translation fr', attempts: 1 });
    pending.get('en')!({ description: 'Translation en', attempts: 1 });
    await vi.waitFor(() => expect(mocks.completeItem).toHaveBeenCalledTimes(2));
    expect(mocks.publish).not.toHaveBeenCalled();

    pending.get('ca')!({ description: 'Translation ca', attempts: 1 });
    await publication;

    expect(mocks.publish).toHaveBeenCalledOnce();
    expect(mocks.publish).toHaveBeenCalledWith({
      jobId: 'job-1',
      translations: [
        { locale: 'ca', description: 'Translation ca' },
        { locale: 'en', description: 'Translation en' },
        { locale: 'fr', description: 'Translation fr' },
      ],
    });
  });

  it('publishes only after all translations validate', async () => {
    await eventImportDraftPublicationWorkflow({ jobId: 'job-1' });

    expect(mocks.completeItem).toHaveBeenCalledTimes(3);
    expect(mocks.publish).toHaveBeenCalledWith({
      jobId: 'job-1',
      translations: [
        { locale: 'ca', description: 'Translation ca' },
        { locale: 'en', description: 'Translation en' },
        { locale: 'fr', description: 'Translation fr' },
      ],
    });
    expect(mocks.revalidateListings).toHaveBeenCalledWith(
      'event-import-publication',
    );
    expect(mocks.revalidateEvent).toHaveBeenCalledWith(
      'trail-1',
      'event-import-publication',
    );
  });

  it('fails without publishing when a translation exhausts its attempts', async () => {
    mocks.generateTranslation.mockRejectedValueOnce(new Error('Translation has an invalid language'));

    await expect(eventImportDraftPublicationWorkflow({ jobId: 'job-1' })).rejects.toThrow(
      'Translation has an invalid language',
    );

    expect(mocks.failItem).toHaveBeenCalledWith({
      itemId: 'item-ca',
      attempts: 3,
      error: 'Translation has an invalid language',
    });
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.failJob).toHaveBeenLastCalledWith('job-1', 'Translation has an invalid language');
  });

  it('fails without generating when the Spanish source is invalid', async () => {
    mocks.getJob.mockResolvedValueOnce({
      id: 'job-1', draftId: 'draft-1', sourceDescription: 'Una frase.', status: 'running',
      workflowRunId: 'workflow-1', acceptedEventId: null, error: null, createdAt: '', updatedAt: '',
    });

    await expect(eventImportDraftPublicationWorkflow({ jobId: 'job-1' })).rejects.toThrow(
      'Spanish description must contain exactly two paragraphs',
    );

    expect(mocks.generateTranslation).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('fails and leaves the event unpublished when the draft changes during translation', async () => {
    mocks.publish.mockRejectedValueOnce(new Error('Draft description changed during translation'));

    await expect(eventImportDraftPublicationWorkflow({ jobId: 'job-1' })).rejects.toThrow(
      'Draft description changed during translation',
    );

    expect(mocks.failJob).toHaveBeenLastCalledWith('job-1', 'Draft description changed during translation');
    expect(mocks.revalidateListings).not.toHaveBeenCalled();
  });
});
