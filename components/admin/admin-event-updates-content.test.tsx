// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { EventUpdateBatchSnapshot } from '@/types/event-update.types';

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  retryItem: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string) => key,
}));
vi.mock('@/lib/api/event-updates', () => ({
  getEventUpdateBatchStatus: mocks.getStatus,
  retryEventUpdateBatchItem: mocks.retryItem,
}));
vi.mock('@/components/ui/section-header', () => ({
  SectionHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/ui/error-message', () => ({
  ErrorMessage: () => <div>error</div>,
}));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

import { AdminEventUpdatesContent } from './admin-event-updates-content';

function snapshot(status: 'failed' | 'running' | 'completed' = 'failed'): EventUpdateBatchSnapshot {
  return {
    batch: {
      id: '8e40792f-1a1a-4d30-8d15-ec70a12a04d5',
      status: 'completed',
      workflowRunId: 'batch-run',
      createdAt: '2026-09-01T05:00:00.000Z',
      updatedAt: '2026-09-01T05:10:00.000Z',
      finishedAt: '2026-09-01T05:10:00.000Z',
      failureReason: null,
    },
    summary: { total: 1, drafted: 0, skipped: 0, failed: status === 'failed' ? 1 : 0, pending: 0, running: status === 'running' ? 1 : 0 },
    items: [{
      id: '6e40792f-1a1a-4d30-8d15-ec70a12a04d5',
      batchId: '8e40792f-1a1a-4d30-8d15-ec70a12a04d5',
      eventId: '4e40792f-1a1a-4d30-8d15-ec70a12a04d5',
      targetYear: 2027,
      sourceUrl: 'https://example.com/event',
      status,
      error: status === 'failed' ? 'Crawl failed' : null,
      outcome: null,
      draftId: null,
      skipReason: null,
      eventName: 'Test event',
      createdAt: '2026-09-01T05:00:00.000Z',
      updatedAt: '2026-09-01T05:10:00.000Z',
    }],
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('AdminEventUpdatesContent', () => {
  it('retries only failed items and refreshes the selected batch', async () => {
    const failedSnapshot = snapshot();
    mocks.retryItem.mockResolvedValue({
      batchId: failedSnapshot.batch.id,
      itemId: failedSnapshot.items[0].id,
      workflowRunId: 'retry-run',
    });
    mocks.getStatus.mockResolvedValue(snapshot('running'));

    render(
      <AdminEventUpdatesContent
        initialHistory={[{ batch: failedSnapshot.batch, summary: failedSnapshot.summary }]}
        initialSnapshot={failedSnapshot}
      />,
    );

    fireEvent.click(screen.getByTitle('detail.retry'));

    await waitFor(() => expect(mocks.retryItem).toHaveBeenCalledWith({
      batchId: failedSnapshot.batch.id,
      itemId: failedSnapshot.items[0].id,
    }));
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledWith(failedSnapshot.batch.id));
  });

  it('polls while an item is active and stops after it completes', async () => {
    vi.useFakeTimers();
    const activeSnapshot = snapshot('running');
    const completedSnapshot = snapshot('completed');
    mocks.getStatus.mockResolvedValue(completedSnapshot);

    render(
      <AdminEventUpdatesContent
        initialHistory={[{ batch: activeSnapshot.batch, summary: activeSnapshot.summary }]}
        initialSnapshot={activeSnapshot}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
  });
});
