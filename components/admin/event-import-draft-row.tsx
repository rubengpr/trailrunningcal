'use client';

import { Check, CircleAlert, CircleCheck, Eye, LoaderCircle, TextCursor, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { EventWebsiteTableCell } from '@/components/event/event-website-table-cell';
import { TableCell, TableRow } from '@/components/ui/table';
import { TableActionButton } from '@/components/ui/table-action-button';
import { formatEventDateRangeNumeric } from '@/lib/events/utils';
import type { EventImportDraft } from '@/types/event-import-draft.types';

interface EventImportDraftRowProps {
  draft: EventImportDraft;
  isPublishing: boolean;
  hasFailedPublication: boolean;
  isComplete: boolean;
  publishDisabled: boolean;
  onPreview: () => void;
  onPublish: () => void;
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

export default function EventImportDraftRow({
  draft,
  isPublishing,
  hasFailedPublication,
  isComplete,
  publishDisabled,
  onPreview,
  onPublish,
  onEdit,
  onDelete,
}: EventImportDraftRowProps) {
  const t = useTranslations('admin.events.drafts');
  const eventsT = useTranslations('adminEvents');
  const format = useFormatter();

  return (
    <TableRow className="align-middle transition-colors duration-150 hover:bg-gray-100">
      <TableCell className="max-w-[200px]">
        <span className="block truncate text-sm font-medium text-gray-900">
          {draft.data.event.name}
        </span>
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
      <TableCell className="whitespace-nowrap text-sm tabular-nums text-gray-700">
        <time dateTime={draft.createdAt}>
          {format.dateTime(new Date(draft.createdAt), {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Madrid',
          })}
        </time>
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
            title={t('view')}
          >
            <Eye className="size-4" strokeWidth={1.5} />
          </TableActionButton>
          <TableActionButton
            onClick={onPublish}
            disabled={publishDisabled}
            title={t('accept')}
            tone="success"
          >
            {isPublishing
              ? <LoaderCircle className="size-4 animate-spin" strokeWidth={1.5} />
              : <Check className="size-4" strokeWidth={1.5} />}
          </TableActionButton>
          <TableActionButton
            onClick={onEdit}
            title={t('edit')}
          >
            <TextCursor className="size-4" strokeWidth={1.5} />
          </TableActionButton>
          <TableActionButton
            onClick={onDelete}
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
