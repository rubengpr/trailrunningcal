'use client';

import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  RefreshCw,
  TextCursor,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { EventWebsiteTableCell } from '@/components/event/event-website-table-cell';
import { TableActionButton } from '@/components/ui/table-action-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { buildAdminEventsHref } from '@/lib/events/admin-pagination';
import { formatEventDateRangeNumeric } from '@/lib/events/utils';
import type { AdminEventPageRequest, AdminEventSortColumn } from '@/types/admin-events.types';
import type { AdminTrailEventDetail, TrailEventDetail } from '@/types/event.types';
import type { EventDraft } from '@/types/event-draft.types';

interface AdminEventsTableProps {
  events: AdminTrailEventDetail[];
  locale: string;
  query: AdminEventPageRequest;
  pendingDraftsByEventId: Record<string, EventDraft>;
  generatingDraftEventIds: Set<string>;
  isDeleting: boolean;
  onReview: (eventId: string) => void;
  onGenerateDraft: (eventDetail: TrailEventDetail) => void;
  onEdit: (eventDetail: AdminTrailEventDetail) => void;
  onDelete: (eventDetail: TrailEventDetail) => void;
}

export function AdminEventsTable({
  events,
  locale,
  query,
  pendingDraftsByEventId,
  generatingDraftEventIds,
  isDeleting,
  onReview,
  onGenerateDraft,
  onEdit,
  onDelete,
}: AdminEventsTableProps): React.ReactElement {
  const t = useTranslations('adminEvents');

  const renderSortIcon = (column: AdminEventSortColumn) => {
    if (column !== query.sortColumn) {
      return <ChevronsUpDown className="size-3.5 text-gray-300" strokeWidth={1.5} />;
    }
    return query.sortDirection === 'asc' ? (
      <ChevronUp className="size-3.5" strokeWidth={2} />
    ) : (
      <ChevronDown className="size-3.5" strokeWidth={2} />
    );
  };

  const getSortHref = (column: AdminEventSortColumn): string => {
    const sortDirection = query.sortColumn === column && query.sortDirection === 'asc'
      ? 'desc'
      : 'asc';

    return buildAdminEventsHref(locale, {
      ...query,
      page: 1,
      sortColumn: column,
      sortDirection,
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableCell header>
          <Link href={getSortHref('name')} className="inline-flex items-center gap-1 transition-colors hover:text-gray-800">
            {t('columns.name')}
            {renderSortIcon('name')}
          </Link>
        </TableCell>
        <TableCell header>{t('columns.website')}</TableCell>
        <TableCell header align="right">{t('columns.races')}</TableCell>
        <TableCell header>
          <Link href={getSortHref('province')} className="inline-flex items-center gap-1 transition-colors hover:text-gray-800">
            {t('columns.province')}
            {renderSortIcon('province')}
          </Link>
        </TableCell>
        <TableCell header>
          <Link href={getSortHref('dates')} className="inline-flex items-center gap-1 transition-colors hover:text-gray-800">
            {t('columns.dates')}
            {renderSortIcon('dates')}
          </Link>
        </TableCell>
        <TableCell header align="right">{t('columns.actions')}</TableCell>
      </TableHeader>
      <TableBody>
        {events.map((eventDetail) => {
          const { event } = eventDetail;
          const isGeneratingDraft = generatingDraftEventIds.has(event.id);
          const pendingDraft = pendingDraftsByEventId[event.id] ?? null;
          const hasPendingDraft = pendingDraft !== null;

          return (
            <TableRow key={event.id} className={`align-middle transition-colors duration-150 hover:bg-gray-100 ${hasPendingDraft ? 'bg-amber-50/35' : ''}`}>
              <TableCell className="max-w-[200px]">
                <div className="flex min-w-0 items-center gap-2">
                  {hasPendingDraft && <span title={t('updateSuggestion.pendingDraft')} className="size-1.5 shrink-0 rounded-full bg-amber-500" />}
                  <Link href={`/${locale}/e/${event.slug}`} prefetch={false} className="block min-w-0 truncate text-sm font-medium text-gray-900 hover:underline">
                    {event.name}
                  </Link>
                </div>
              </TableCell>
              <EventWebsiteTableCell url={event.websiteUrl} missingLabel={t('missingUrl')} missingClassName="text-sm text-red-600" />
              <TableCell align="right" className="text-sm tabular-nums text-gray-700">{eventDetail.allRaceCount}</TableCell>
              <TableCell className="text-sm text-gray-700">
                {eventDetail.location.groups.toSorted((a, b) => a.province.localeCompare(b.province)).map(({ province }) => province).join(', ') || t('noProvince')}
              </TableCell>
              <TableCell className="text-sm text-gray-700">{formatEventDateRangeNumeric(eventDetail.dateRange, t('noDates'))}</TableCell>
              <TableCell align="right">
                <div className="inline-flex items-center justify-end gap-1">
                  {hasPendingDraft && (
                    <TableActionButton onClick={() => onReview(event.id)} title={t('updateSuggestion.reviewPendingDraft')} tone="warning">
                      <Eye className="size-4" strokeWidth={1.5} />
                    </TableActionButton>
                  )}
                  <TableActionButton onClick={() => onGenerateDraft(eventDetail)} disabled={!event.websiteUrl || isGeneratingDraft || hasPendingDraft} title={hasPendingDraft ? t('updateSuggestion.reviewPendingDraft') : event.websiteUrl ? t('updateSuggestion.button') : t('updateSuggestion.missingUrl')}>
                    <RefreshCw className={`size-4 ${isGeneratingDraft ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                  </TableActionButton>
                  <TableActionButton onClick={() => onEdit(eventDetail)} title={t('edit.button')}>
                    <TextCursor className="size-4" strokeWidth={1.5} />
                  </TableActionButton>
                  <TableActionButton onClick={() => onDelete(eventDetail)} disabled={isDeleting} title={t('delete.button')} tone="destructive">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </TableActionButton>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
