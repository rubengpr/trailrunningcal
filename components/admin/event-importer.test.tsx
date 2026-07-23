// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventImportResult } from '@/types/events-import-api.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface PreviewProps {
  event: TrailEventAgentEvent | null;
  races: TrailEventAgentRace[];
  onSaveReview: (
    event: TrailEventAgentEvent,
    races: TrailEventAgentRace[],
  ) => Promise<void> | void;
  onAccept: () => Promise<void>;
  isAccepted: boolean;
  showReject?: boolean;
}

interface BulkTableProps {
  rows: Array<{
    id: string;
    reviewStatus: 'pending' | 'accepted';
    acceptedEventId: string | null;
    acceptedEventSlug: string | null;
  }>;
  onViewResult?: (itemId: string) => void;
}

const mocks = vi.hoisted(() => ({
  startEventImportBatch: vi.fn(),
  getEventImportBatchStatus: vi.fn(),
  getEventImportItemResult: vi.fn(),
  updateEventImportItemResult: vi.fn(),
  acceptEventImportItem: vi.fn(),
  acceptScrapedEvent: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('react-hot-toast', () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));
vi.mock('@/lib/api/events', () => ({
  runTrailEventAgent: vi.fn(),
  runEventImport: vi.fn(),
  acceptScrapedEvent: mocks.acceptScrapedEvent,
  startEventImportBatch: mocks.startEventImportBatch,
  getEventImportBatchStatus: mocks.getEventImportBatchStatus,
  getEventImportItemResult: mocks.getEventImportItemResult,
  updateEventImportItemResult: mocks.updateEventImportItemResult,
  acceptEventImportItem: mocks.acceptEventImportItem,
}));
vi.mock('@/lib/api/pending-events', () => ({ addPendingEvents: vi.fn() }));
vi.mock('@/components/admin/import-cost-summary', () => ({
  ImportCostSummary: () => null,
}));
vi.mock('@/components/ui/race-conflict-modal', () => ({
  RaceConflictModal: () => null,
}));
vi.mock('@/components/admin/bulk-process-table', () => ({
  BulkProcessTable: ({ rows, onViewResult }: BulkTableProps) => (
    <div>
      <span>{rows[0].reviewStatus}</span>
      {rows[0].acceptedEventId ? <span>{rows[0].acceptedEventId}</span> : null}
      {rows[0].acceptedEventSlug ? <span>{rows[0].acceptedEventSlug}</span> : null}
      <button type="button" onClick={() => onViewResult?.(rows[0].id)}>
        open-batch-result
      </button>
    </div>
  ),
}));
vi.mock('@/components/admin/event-import-preview', () => ({
  EventImportPreview: ({
    event,
    races,
    onSaveReview,
    onAccept,
    isAccepted,
    showReject,
  }: PreviewProps) => {
    if (!event) return null;

    return (
      <div>
        <span>{event.description}</span>
        <span>{isAccepted ? 'preview-accepted' : 'preview-pending'}</span>
        <span>{showReject === false ? 'reject-hidden' : 'reject-visible'}</span>
        <button
          type="button"
          onClick={() =>
            void onSaveReview(
              { ...event, description: 'Persisted edited description' },
              races,
            )
          }
        >
          save-batch-review
        </button>
        <button type="button" onClick={() => void onAccept()}>
          accept-batch-result
        </button>
      </div>
    );
  },
}));

import { EventImporter } from './event-importer';

const ITEM_ID = '8e40792f-1a1a-4d30-8d15-ec70a12a04d5';
const originalResult: EventImportResult = {
  workflow: 'crawlSiteExtract',
  url: 'https://example.com/event',
  event: {
    name: 'Trail Event',
    description: 'Original description',
    websiteUrl: 'https://example.com/event',
  },
  races: [
    {
      name: '21K',
      date: '2027-05-01',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 21,
      elevationGainM: 900,
      tiers: [],
    },
  ],
  errorMessage: null,
  markdown: '# Event',
  rawModelOutput: '{}',
  usage: null,
  pageStats: null,
  scrapeUsage: null,
  fallbackUsed: false,
  steps: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.startEventImportBatch.mockResolvedValue({
    ok: true,
    data: { batchId: 'batch-1', workflowRunId: 'run-1' },
  });
  mocks.getEventImportBatchStatus.mockResolvedValue({
    batch: {
      id: 'batch-1',
      status: 'completed',
      model: 'openai/gpt-5.4-mini',
      workflowRunId: 'run-1',
      createdAt: '2026-07-22T10:00:00.000Z',
      updatedAt: '2026-07-22T10:01:00.000Z',
    },
    summary: {
      total: 1,
      pending: 0,
      running: 0,
      completed: 1,
      failed: 0,
    },
    items: [
      {
        id: ITEM_ID,
        batchId: 'batch-1',
        url: originalResult.url,
        status: 'completed',
        reviewStatus: 'pending',
        acceptedEventId: null,
        acceptedEventSlug: null,
        reviewedAt: null,
        raceCount: 1,
        error: null,
        markdown: originalResult.markdown,
        rawModelOutput: originalResult.rawModelOutput,
        createdAt: '2026-07-22T10:00:00.000Z',
        updatedAt: '2026-07-22T10:01:00.000Z',
      },
    ],
  });
  mocks.getEventImportItemResult.mockResolvedValue(originalResult);
  mocks.updateEventImportItemResult.mockImplementation(
    async (_itemId: string, input: Pick<EventImportResult, 'event' | 'races'>) => ({
      ...originalResult,
      ...input,
    }),
  );
  mocks.acceptEventImportItem.mockResolvedValue({
    eventId: 'event-1',
    eventSlug: 'accepted-event',
  });
  mocks.acceptScrapedEvent.mockResolvedValue({ id: 'single-event-1' });
});

afterEach(cleanup);

describe('EventImporter batch review', () => {
  it('persists preview edits for the opened batch item and renders them', async () => {
    render(<EventImporter pendingEntries={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'workflowBulk' }));
    fireEvent.change(screen.getByLabelText('bulk.urlsLabel'), {
      target: { value: originalResult.url },
    });
    fireEvent.click(screen.getByRole('button', { name: 'runWorkflowButton' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'open-batch-result' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'open-batch-result' }));

    await waitFor(() => {
      expect(screen.getByText('Original description')).toBeTruthy();
      expect(screen.getByTestId('event-import-preview-backdrop')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'save-batch-review' }));

    await waitFor(() => {
      expect(mocks.updateEventImportItemResult).toHaveBeenCalledWith(ITEM_ID, {
        event: {
          ...originalResult.event,
          description: 'Persisted edited description',
        },
        races: originalResult.races,
      });
      expect(screen.getByText('Persisted edited description')).toBeTruthy();
      expect(mocks.toastSuccess).toHaveBeenCalledWith('bulk.reviewSaveSuccess');
    });
  });

  it('accepts the persisted batch item, closes the modal, and restores read-only state when reopened', async () => {
    render(<EventImporter pendingEntries={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'workflowBulk' }));
    fireEvent.change(screen.getByLabelText('bulk.urlsLabel'), {
      target: { value: originalResult.url },
    });
    fireEvent.click(screen.getByRole('button', { name: 'runWorkflowButton' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'open-batch-result' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'open-batch-result' }));

    await waitFor(() => {
      expect(screen.getByText('reject-hidden')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'accept-batch-result' }));

    await waitFor(() => {
      expect(mocks.acceptEventImportItem).toHaveBeenCalledWith(ITEM_ID);
      expect(screen.getAllByText('accepted').length).toBeGreaterThan(0);
      expect(screen.getByText('event-1')).toBeTruthy();
      expect(screen.getByText('accepted-event')).toBeTruthy();
      expect(screen.queryByTestId('event-import-preview-backdrop')).toBeNull();
      expect(screen.getByRole('button', { name: 'open-batch-result' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'open-batch-result' }));

    await waitFor(() => {
      expect(screen.getByText('preview-accepted')).toBeTruthy();
      expect(screen.getByText('reject-hidden')).toBeTruthy();
    });
  });

  it('keeps the batch preview open when acceptance fails', async () => {
    mocks.acceptEventImportItem.mockRejectedValue(new Error('accept failed'));
    render(<EventImporter pendingEntries={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'workflowBulk' }));
    fireEvent.change(screen.getByLabelText('bulk.urlsLabel'), {
      target: { value: originalResult.url },
    });
    fireEvent.click(screen.getByRole('button', { name: 'runWorkflowButton' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'open-batch-result' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'open-batch-result' }));

    await waitFor(() => {
      expect(screen.getByText('preview-pending')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'accept-batch-result' }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('bulk.acceptError');
      expect(screen.getByTestId('event-import-preview-backdrop')).toBeTruthy();
      expect(screen.getByText('preview-pending')).toBeTruthy();
    });
  });

  it('keeps single imports on the existing create-event flow with rejection visible', async () => {
    render(<EventImporter pendingEntries={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'loadDummyPreview' }));

    expect(screen.getByText('reject-visible')).toBeTruthy();
    expect(screen.queryByTestId('event-import-preview-backdrop')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'accept-batch-result' }));

    await waitFor(() => {
      expect(mocks.acceptScrapedEvent).toHaveBeenCalledOnce();
      expect(mocks.acceptEventImportItem).not.toHaveBeenCalled();
    });
  });
});
