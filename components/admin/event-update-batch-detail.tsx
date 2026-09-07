import { ExternalLink, RefreshCw, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventUpdateStatusDot } from '@/components/admin/event-update-status-dot';
import { IconButton } from '@/components/ui/icon-button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import type { EventUpdateBatchSnapshot } from '@/types/event-update.types';

interface EventUpdateBatchDetailProps {
  snapshot: EventUpdateBatchSnapshot;
  locale: string;
  isLoading: boolean;
  retryingItemId: string | null;
  onRetry: (itemId: string) => void;
}

export function EventUpdateBatchDetail({
  snapshot,
  locale,
  isLoading,
  retryingItemId,
  onRetry,
}: EventUpdateBatchDetailProps): React.ReactElement {
  const t = useTranslations('admin.events.updates');

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('detail.title')}</h2>
          {snapshot.batch.failureReason ? <p className="mt-1 text-sm text-red-700">{snapshot.batch.failureReason}</p> : null}
        </div>
        {isLoading ? <RefreshCw className="size-4 animate-spin text-gray-400" /> : null}
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
              <TableCell className="px-4"><EventUpdateStatusDot status={item.status} /></TableCell>
              <TableCell className="max-w-[220px] truncate text-sm font-medium text-gray-900">{item.eventName ?? t('detail.unknownEvent')}</TableCell>
              <TableCell className="max-w-[180px] truncate text-sm"><a className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900" href={item.sourceUrl} target="_blank" rel="noreferrer"><span className="truncate">{item.sourceUrl}</span><ExternalLink className="size-3 shrink-0" /></a></TableCell>
              <TableCell className="text-sm">{item.outcome === 'drafted' && item.draftId ? <a className="font-medium text-emerald-700 hover:underline" href={`/${locale}/admin/eventos/borradores?draftId=${item.draftId}`}>{t('outcome.drafted')}</a> : item.outcome ? t(`outcome.${item.outcome}`) : t('outcome.unclassified')}</TableCell>
              <TableCell className="max-w-[320px] text-sm text-gray-600">{item.status === 'failed' ? item.error : item.skipReason}</TableCell>
              <TableCell className="px-4 text-right">
                {item.status === 'failed' ? (
                  <IconButton title={t('detail.retry')} aria-label={t('detail.retry')} disabled={retryingItemId !== null} onClick={() => onRetry(item.id)}>
                    <RotateCcw className={retryingItemId === item.id ? 'size-4 animate-spin' : 'size-4'} />
                  </IconButton>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
