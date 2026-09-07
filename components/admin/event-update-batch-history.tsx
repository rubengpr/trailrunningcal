import { CalendarDays, Clock3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventUpdateStatusDot } from '@/components/admin/event-update-status-dot';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import type { EventUpdateBatchHistoryEntry, EventUpdateBatchSnapshot } from '@/types/event-update.types';

interface EventUpdateBatchHistoryProps {
  history: EventUpdateBatchHistoryEntry[];
  selectedBatchId?: string;
  dateFormatter: Intl.DateTimeFormat;
  timeFormatter: Intl.DateTimeFormat;
  formatDuration: (batch: EventUpdateBatchSnapshot['batch']) => string;
  onSelect: (batchId: string) => void;
}

export function EventUpdateBatchHistory({
  history,
  selectedBatchId,
  dateFormatter,
  timeFormatter,
  formatDuration,
  onSelect,
}: EventUpdateBatchHistoryProps): React.ReactElement {
  const t = useTranslations('admin.events.updates');

  return (
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
            onClick={() => onSelect(entry.batch.id)}
            className={selectedBatchId === entry.batch.id ? 'bg-gray-50' : ''}
          >
            <TableCell className="px-4"><EventUpdateStatusDot status={entry.batch.status} /></TableCell>
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
            <TableCell className="text-xs tabular-nums text-gray-600">{formatDuration(entry.batch)}</TableCell>
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
  );
}
