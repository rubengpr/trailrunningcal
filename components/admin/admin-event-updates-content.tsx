'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, Clock3, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react';

import { SectionHeader } from '@/components/ui/section-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip } from '@/components/ui/tooltip';
import { IconButton } from '@/components/ui/icon-button';
import { getEventUpdateBatchStatus, retryEventUpdateBatchItem } from '@/lib/api/event-updates';
import type {
  EventUpdateBatchHistoryEntry,
  EventUpdateBatchItemStatus,
  EventUpdateBatchSnapshot,
} from '@/types/event-update.types';

interface AdminEventUpdatesContentProps {
  initialHistory: EventUpdateBatchHistoryEntry[];
  initialSnapshot: EventUpdateBatchSnapshot | null;
}

function statusDotClass(status: EventUpdateBatchItemStatus): string {
  return {
    pending: 'bg-amber-500',
    running: 'bg-violet-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
  }[status];
}

function StatusDot({ status, label }: { status: EventUpdateBatchItemStatus; label: string }) {
  return (
    <Tooltip text={label} size="sm">
      <span className={`size-2.5 rounded-full ${statusDotClass(status)}`} />
    </Tooltip>
  );
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
          <Table>
            <TableHeader>
              <TableCell header className="w-12 px-4"><span className="sr-only">{t('table.status')}</span></TableCell>
              <TableCell header>{t('table.started')}</TableCell>
              <TableCell header>{t('table.duration')}</TableCell>
              <TableCell header align="right">{t('table.total')}</TableCell>
              <TableCell header align="right">{t('table.drafted')}</TableCell>
              <TableCell header align="right">{t('table.skipped')}</TableCell>
              <TableCell header align="right">{t('table.failed')}</TableCell>
              <TableCell header align="right">{t('table.pending')}</TableCell>
              <TableCell header align="right">{t('table.running')}</TableCell>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow
                  key={entry.batch.id}
                  clickable
                  onClick={() => void load(entry.batch.id)}
                  className={snapshot?.batch.id === entry.batch.id ? 'bg-gray-50' : ''}
                >
                  <TableCell className="px-4">
                    <StatusDot status={entry.batch.status} label={t(`status.${entry.batch.status}`)} />
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-900">
                    <div className="flex items-center justify-center gap-1.5 text-center">
                      <span className="inline-flex w-24 items-center justify-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        <CalendarDays className="size-3" />
                        {dateFormatter.format(new Date(entry.batch.createdAt))}
                      </span>
                      <span className="inline-flex w-24 items-center justify-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-600">
                        <Clock3 className="size-3" />
                        {timeFormatter.format(new Date(entry.batch.createdAt))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-gray-600">{duration(entry.batch)}</TableCell>
                  <TableCell align="right" className="tabular-nums text-xs">{entry.summary.total}</TableCell>
                  <TableCell align="right" className="tabular-nums text-xs">{entry.summary.drafted}</TableCell>
                  <TableCell align="right" className="tabular-nums text-xs">{entry.summary.skipped}</TableCell>
                  <TableCell align="right" className="tabular-nums text-xs">{entry.summary.failed}</TableCell>
                  <TableCell align="right" className="tabular-nums text-xs">{entry.summary.pending}</TableCell>
                  <TableCell align="right" className="tabular-nums text-xs">{entry.summary.running}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(hasLoadError || hasRetryError) && snapshot ? (
            <ErrorMessage
              variant="inline"
              onRetry={() => void load(snapshot.batch.id)}
            />
          ) : null}
          {snapshot ? (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('detail.title')}</h2>
                  {snapshot.batch.failureReason ? <p className="mt-1 text-sm text-red-700">{snapshot.batch.failureReason}</p> : null}
                </div>
                {loadingId === snapshot.batch.id ? <RefreshCw className="size-4 animate-spin text-gray-400" /> : null}
              </div>
              <Table>
                <TableHeader>
                  <TableCell header className="w-12 px-4"><span className="sr-only">{t('detail.status')}</span></TableCell>
                  <TableCell header>{t('detail.event')}</TableCell>
                  <TableCell header>{t('detail.url')}</TableCell>
                  <TableCell header>{t('detail.outcome')}</TableCell>
                  <TableCell header>{t('detail.message')}</TableCell>
                  <TableCell header className="w-12 px-4"><span className="sr-only">{t('detail.retry')}</span></TableCell>
                </TableHeader>
                <TableBody>
                  {snapshot.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-4"><StatusDot status={item.status} label={t(`status.${item.status}`)} /></TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm font-medium text-gray-900">{item.eventName ?? t('detail.unknownEvent')}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm"><a className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900" href={item.sourceUrl} target="_blank" rel="noreferrer"><span className="truncate">{item.sourceUrl}</span><ExternalLink className="size-3 shrink-0" /></a></TableCell>
                      <TableCell className="text-sm">{item.outcome === 'drafted' && item.draftId ? <a className="font-medium text-emerald-700 hover:underline" href={`/${locale}/admin/eventos/borradores?draftId=${item.draftId}`}>{t('outcome.drafted')}</a> : item.outcome ? t(`outcome.${item.outcome}`) : t('outcome.unclassified')}</TableCell>
                      <TableCell className="max-w-[320px] text-sm text-gray-600">{item.status === 'failed' ? item.error : item.skipReason}</TableCell>
                      <TableCell className="px-4 text-right">
                        {item.status === 'failed' ? (
                          <IconButton
                            title={t('detail.retry')}
                            aria-label={t('detail.retry')}
                            disabled={retryingItemId !== null}
                            onClick={() => void retry(item.id)}
                          >
                            <RotateCcw className={retryingItemId === item.id ? 'size-4 animate-spin' : 'size-4'} />
                          </IconButton>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
