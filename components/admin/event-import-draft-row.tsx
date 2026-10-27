'use client';

import { useTranslations } from 'next-intl';
import { Check, CircleAlert, CircleCheck, Eye, LoaderCircle, TextCursor, Trash2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { TableActionButton } from '@/components/ui/table-action-button';
import { EventWebsiteTableCell } from '@/components/event/event-website-table-cell';
import { formatEventDateRangeNumeric } from '@/lib/events/utils';
import type { EventImportDraft } from '@/types/event-import-draft.types';

interface EventImportDraftRowProps {
  draft: EventImportDraft;
  isComplete: boolean;
  isPublishing: boolean;
  hasFailedPublication: boolean;
  acceptDisabled: boolean;
  onPreview: () => void;
  onAccept: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function getDraftDateRange(draft: EventImportDraft): {
  startDate: string | null;
  endDate: string | null;
} {
  const dates = draft.data.races
    .flatMap((race) => race.date ? [race.date] : [])
    .sort();

  return {
    startDate: dates[0] ?? null,
    endDate: dates.at(-1) ?? null,
  };
}

export function EventImportDraftRow({
  draft,
  isComplete,
  isPublishing,
  hasFailedPublication,
  acceptDisabled,
  onPreview,
  onAccept,
  onEdit,
  onDelete,
}: EventImportDraftRowProps) {
  const t = useTranslations('admin.events.drafts');
  const eventsT = useTranslations('adminEvents');
  const isProcessed = draft.status !== 'draft';

  return (
    <TableRow className={`align-middle transition-colors duration-150 ${isProcessed ? 'opacity-50' : 'hover:bg-gray-100'}`}>
      <TableCell>
        <div className="flex w-[280px] items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900" title={draft.data.event.name}>
            {draft.data.event.name}
          </span>
          <span className={`w-20 shrink-0 text-right text-xs font-medium ${isProcessed ? '' : 'invisible'}`}>
            {t(draft.status === 'rejected' ? 'status.rejected' : 'status.accepted')}
          </span>
        </div>
      </TableCell>
      <EventWebsiteTableCell
        url={draft.sourceUrl}
        missingLabel={eventsT('missingUrl')}
        missingClassName="text-sm text-red-600"
      />
      <TableCell align="right" className="text-sm tabular-nums text-gray-700">
        {draft.data.races.length}
      </TableCell>
      <TableCell className="text-sm text-gray-700">
        {formatEventDateRangeNumeric(getDraftDateRange(draft), eventsT('noDates'))}
      </TableCell>
      <TableCell align="right">
        <div className="flex items-center justify-end gap-1">
          {isComplete ? (
            <span
              className="mr-2 inline-flex shrink-0 items-center justify-center text-emerald-600"
              title={t('completeInformation')}
            >
              <CircleCheck className="size-4 [&>circle]:fill-emerald-50" strokeWidth={2} />
              <span className="sr-only">{t('completeInformation')}</span>
            </span>
          ) : null}
          {hasFailedPublication ? (
            <span className="mt-2" title={t('acceptError')}>
              <CircleAlert className="size-4 text-red-600" strokeWidth={1.5} />
            </span>
          ) : null}
          <TableActionButton
            onClick={onPreview}
            disabled={isProcessed}
            title={t('view')}
          >
            <Eye className="size-4" strokeWidth={1.5} />
          </TableActionButton>
          <TableActionButton
            onClick={onAccept}
            disabled={isProcessed || acceptDisabled || isPublishing}
            title={t('accept')}
            tone="success"
          >
            {isPublishing
              ? <LoaderCircle className="size-4 animate-spin" strokeWidth={1.5} />
              : <Check className="size-4" strokeWidth={1.5} />}
          </TableActionButton>
          <TableActionButton
            onClick={onEdit}
            disabled={isProcessed}
            title={t('edit')}
          >
            <TextCursor className="size-4" strokeWidth={1.5} />
          </TableActionButton>
          <TableActionButton
            onClick={onDelete}
            disabled={isProcessed}
            title={t('delete.button')}
            tone="destructive"
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </TableActionButton>
        </div>
      </TableCell>
    </TableRow>
  );
}
