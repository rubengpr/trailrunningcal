'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { EventUpdateBatchDetail } from '@/components/admin/event-update-batch-detail';
import { EventUpdateBatchHistory } from '@/components/admin/event-update-batch-history';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { getEventUpdateBatchStatus, retryEventUpdateBatchItem } from '@/lib/api/event-updates';
import type {
  EventUpdateBatchHistoryEntry,
  EventUpdateBatchSnapshot,
} from '@/types/event-update.types';

interface AdminEventUpdatesContentProps {
  initialHistory: EventUpdateBatchHistoryEntry[];
  initialSnapshot: EventUpdateBatchSnapshot | null;
}

function isActive(snapshot: EventUpdateBatchSnapshot | null): boolean {
  return snapshot?.batch.status === 'pending'
    || snapshot?.batch.status === 'running'
    || snapshot?.items.some((item) => item.status === 'pending' || item.status === 'running') === true;
}

function sortHistory(entries: EventUpdateBatchHistoryEntry[]): EventUpdateBatchHistoryEntry[] {
  return [...entries].sort(
    (left, right) => new Date(right.batch.createdAt).getTime() - new Date(left.batch.createdAt).getTime(),
  );
}

export function AdminEventUpdatesContent({
  initialHistory,
  initialSnapshot,
}: AdminEventUpdatesContentProps): React.ReactElement {
  const t = useTranslations('admin.events.updates');
  const locale = useLocale();
  const [history, setHistory] = useState(() => sortHistory(initialHistory));
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [hasRetryError, setHasRetryError] = useState(false);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short',
  }), [locale]);
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit',
  }), [locale]);

  const duration = useCallback((entry: EventUpdateBatchSnapshot['batch']): string => {
    if (!entry.finishedAt) return '—';
    const end = new Date(entry.finishedAt).getTime();
    const seconds = Math.max(0, Math.floor((end - new Date(entry.createdAt).getTime()) / 1000));
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`;
  }, []);

  const load = useCallback(async (batchId: string): Promise<void> => {
    setLoadingId(batchId);
    try {
      const next = await getEventUpdateBatchStatus(batchId);
      setSnapshot(next);
      setHistory((current) => sortHistory(current.map((entry) => entry.batch.id === batchId
        ? { batch: next.batch, summary: next.summary }
        : entry)));
      window.history.replaceState(null, '', `?batchId=${batchId}`);
      setHasLoadError(false);
    } catch {
      setHasLoadError(true);
    } finally {
      setLoadingId(null);
    }
  }, []);

  const retry = useCallback(async (itemId: string): Promise<void> => {
    if (!snapshot) return;

    setRetryingItemId(itemId);
    try {
      await retryEventUpdateBatchItem({ batchId: snapshot.batch.id, itemId });
      await load(snapshot.batch.id);
      setHasRetryError(false);
    } catch {
      setHasRetryError(true);
    } finally {
      setRetryingItemId(null);
    }
  }, [load, snapshot]);

  useEffect(() => {
    if (!isActive(snapshot)) return;
    const intervalId = window.setInterval(() => {
      if (snapshot) void load(snapshot.batch.id);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [load, snapshot]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title={t('title')} />
      {history.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">{t('empty')}</p>
      ) : (
        <>
          <EventUpdateBatchHistory
            history={history}
            selectedBatchId={snapshot?.batch.id}
            dateFormatter={dateFormatter}
            timeFormatter={timeFormatter}
            formatDuration={duration}
            onSelect={(batchId) => void load(batchId)}
          />
          {(hasLoadError || hasRetryError) && snapshot ? (
            <ErrorMessage
              variant="inline"
              onRetry={() => void load(snapshot.batch.id)}
            />
          ) : null}
          {snapshot ? (
            <EventUpdateBatchDetail
              snapshot={snapshot}
              locale={locale}
              isLoading={loadingId === snapshot.batch.id}
              retryingItemId={retryingItemId}
              onRetry={(itemId) => void retry(itemId)}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
