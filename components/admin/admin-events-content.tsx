'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  RefreshCw,
  TextCursor,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseModal } from '@/components/ui/base-modal';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import {
  createEventEdition,
  deleteEvent,
  runEventImport,
} from '@/lib/api/events';
import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import { formatEventDateRangeNumeric } from '@/lib/events/utils';
import { cleanUrl } from '@/lib/utils/url';
import type { TrailEventDetail } from '@/types/event.types';
import type { EventImportResult } from '@/types/events-import-api.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface AdminEventsContentProps {
  events: TrailEventDetail[];
}

type SortColumn = 'name' | 'dates';
type SortDirection = 'asc' | 'desc';

export function AdminEventsContent({ events }: AdminEventsContentProps) {
  const t = useTranslations('adminEvents');
  const locale = useLocale();
  const router = useRouter();
  const [eventToDelete, setEventToDelete] = useState<TrailEventDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingSuggestionIds, setLoadingSuggestionIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Record<string, EventImportResult>>({});
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);
  const [acceptingSuggestionId, setAcceptingSuggestionId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('dates');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const subtitle = events.length === 1
    ? t('eventCountOne')
    : t('eventCount', { count: events.length });

  const sortedEvents = useMemo(() => {
    const directionFactor = sortDirection === 'asc' ? 1 : -1;

    return [...events].sort((a, b) => {
      const comparison =
        sortColumn === 'name'
          ? a.event.name.localeCompare(b.event.name, locale)
          : (a.dateRange.startDate ?? '').localeCompare(b.dateRange.startDate ?? '');

      return comparison * directionFactor;
    });
  }, [events, sortColumn, sortDirection, locale]);

  const handleSort = (column: SortColumn): void => {
    if (column === sortColumn) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: SortColumn) => {
    if (column !== sortColumn) {
      return <ChevronsUpDown className="size-3.5 text-gray-300" strokeWidth={1.5} />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="size-3.5" strokeWidth={2} />
    ) : (
      <ChevronDown className="size-3.5" strokeWidth={2} />
    );
  };

  const reviewEventDetail = reviewEventId
    ? events.find((eventDetail) => eventDetail.event.id === reviewEventId) ?? null
    : null;
  const reviewSuggestion = reviewEventId ? suggestions[reviewEventId] : null;

  useEffect(() => {
    if (!reviewEventId) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setReviewEventId(null);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [reviewEventId]);

  const setSuggestionLoading = (eventId: string, isLoading: boolean): void => {
    setLoadingSuggestionIds((ids) => {
      const nextIds = new Set(ids);
      if (isLoading) {
        nextIds.add(eventId);
      } else {
        nextIds.delete(eventId);
      }
      return nextIds;
    });
  };

  const handleGenerateSuggestion = async (
    eventDetail: TrailEventDetail,
  ): Promise<void> => {
    const websiteUrl = eventDetail.event.websiteUrl;
    if (!websiteUrl) {
      toast.error(t('updateSuggestion.missingUrl'));
      return;
    }

    const eventId = eventDetail.event.id;
    setSuggestionLoading(eventId, true);

    try {
      const result = await runEventImport({
        workflow: 'crawlSiteExtract',
        websiteUrl,
        model: OPENROUTER_SCRAPE_MODEL_IDS[0],
        skipDuplicateCheck: true,
      });

      if (!result.ok) {
        toast.error(t('updateSuggestion.extractError'));
        return;
      }

      setSuggestions((current) => ({
        ...current,
        [eventId]: result.data,
      }));
      toast.success(t('updateSuggestion.extractSuccess'));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('updateSuggestion.extractError'),
      );
    } finally {
      setSuggestionLoading(eventId, false);
    }
  };

  const handleSaveSuggestionReview = (
    eventId: string,
    event: TrailEventAgentEvent,
    races: TrailEventAgentRace[],
  ): void => {
    setSuggestions((current) => {
      const suggestion = current[eventId];
      if (!suggestion) return current;

      return {
        ...current,
        [eventId]: {
          ...suggestion,
          event,
          races,
        },
      };
    });
  };

  const handleRejectSuggestion = (eventId: string): void => {
    setSuggestions((current) => {
      const remaining = { ...current };
      delete remaining[eventId];
      return remaining;
    });
    setReviewEventId(null);
    toast.success(t('updateSuggestion.rejectSuccess'));
  };

  const handleAcceptSuggestion = async (eventId: string): Promise<void> => {
    const suggestion = suggestions[eventId];
    if (!suggestion?.event || suggestion.races.length === 0) return;

    setAcceptingSuggestionId(eventId);
    try {
      await createEventEdition(
        eventId,
        suggestion.event,
        suggestion.races,
      );
      setSuggestions((current) => {
        const remaining = { ...current };
        delete remaining[eventId];
        return remaining;
      });
      setReviewEventId(null);
      toast.success(t('updateSuggestion.acceptSuccess'));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('updateSuggestion.acceptError'),
      );
    } finally {
      setAcceptingSuggestionId(null);
    }
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!eventToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteEvent(eventToDelete.event.id);
      setEventToDelete(null);
      toast.success(t('delete.success'));
      router.refresh();
    } catch {
      toast.error(t('delete.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title={t('title')}
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/${locale}/admin/eventos/import`)}
            >
              {t('extractEvents')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/${locale}/admin/eventos/new`)}
            >
              {t('newEvent')}
            </Button>
            <Button onClick={() => router.push(`/${locale}/admin/eventos/descripciones`)}>
              {t('generateDescriptions')}
            </Button>
          </div>
        }
      />

      {events.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {t('empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableCell
              header
              className="cursor-pointer select-none transition-colors hover:text-gray-800"
              onClick={() => handleSort('name')}
            >
              <span className="inline-flex items-center gap-1">
                {t('columns.name')}
                {renderSortIcon('name')}
              </span>
            </TableCell>
            <TableCell header>{t('columns.website')}</TableCell>
            <TableCell header align="right">{t('columns.races')}</TableCell>
            <TableCell
              header
              className="cursor-pointer select-none transition-colors hover:text-gray-800"
              onClick={() => handleSort('dates')}
            >
              <span className="inline-flex items-center gap-1">
                {t('columns.dates')}
                {renderSortIcon('dates')}
              </span>
            </TableCell>
            <TableCell header align="right">{t('columns.actions')}</TableCell>
          </TableHeader>
          <TableBody>
            {sortedEvents.map((eventDetail) => {
              const { event } = eventDetail;
              const isLoadingSuggestion = loadingSuggestionIds.has(event.id);
              const hasSuggestion = suggestions[event.id] !== undefined;

              return (
                <TableRow key={event.id} className="align-middle hover:bg-gray-100 transition-colors duration-150">
                  <TableCell className="max-w-[200px]">
                    <Link
                      href={`/${locale}/e/${event.slug}`}
                      prefetch={false}
                      className="block truncate text-sm font-medium text-gray-900 hover:underline"
                    >
                      {event.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    {event.websiteUrl ? (
                      <a
                        href={event.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm text-gray-500 hover:text-gray-800 hover:underline"
                      >
                        {cleanUrl(event.websiteUrl)}
                      </a>
                    ) : (
                      <span className="text-sm text-red-600">{t('missingUrl')}</span>
                    )}
                  </TableCell>
                  <TableCell align="right" className="text-sm tabular-nums text-gray-700">
                    {eventDetail.allRaceCount}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {formatEventDateRangeNumeric(eventDetail.dateRange, t('noDates'))}
                  </TableCell>
                  <TableCell align="right">
                    <div className="inline-flex items-center justify-end gap-1">
                      {hasSuggestion && (
                        <button
                          type="button"
                          onClick={() => setReviewEventId(event.id)}
                          title={t('updateSuggestion.viewButton')}
                          className="inline-flex size-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
                        >
                          <Eye className="size-4" strokeWidth={1.5} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleGenerateSuggestion(eventDetail)}
                        disabled={!event.websiteUrl || isLoadingSuggestion}
                        title={
                          event.websiteUrl
                            ? t('updateSuggestion.button')
                            : t('updateSuggestion.missingUrl')
                        }
                        className="inline-flex size-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                      >
                        <RefreshCw
                          className={`size-4 ${isLoadingSuggestion ? 'animate-spin' : ''}`}
                          strokeWidth={1.5}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/${locale}/admin/eventos/${event.id}`)}
                        title={t('edit.button')}
                        className="inline-flex size-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
                      >
                        <TextCursor className="size-4" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventToDelete(eventDetail)}
                        disabled={isDeleting}
                        title={t('delete.button')}
                        className="inline-flex size-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                      >
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {reviewEventDetail && reviewSuggestion && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/60 px-4 py-10 backdrop-blur-[1px] sm:py-14">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setReviewEventId(null)}
          />
          <div className="relative z-10 w-full max-w-4xl">
            <button
              type="button"
              onClick={() => setReviewEventId(null)}
              title={t('updateSuggestion.closeButton')}
              className="absolute -top-3 -right-3 z-20 inline-flex size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:text-gray-900 cursor-pointer"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
            <EventImportPreview
              event={reviewSuggestion.event}
              races={reviewSuggestion.races}
              isLoading={false}
              error={null}
              emptyMessage={reviewSuggestion.errorMessage}
              onAccept={() => handleAcceptSuggestion(reviewEventDetail.event.id)}
              isAccepted={false}
              isAccepting={acceptingSuggestionId === reviewEventDetail.event.id}
              onReject={() => handleRejectSuggestion(reviewEventDetail.event.id)}
              isRejected={false}
              onSaveReview={(event, races) =>
                handleSaveSuggestionReview(reviewEventDetail.event.id, event, races)
              }
            />
          </div>
        </div>
      )}

      <BaseModal
        isOpen={eventToDelete !== null}
        onClose={() => setEventToDelete(null)}
        title={t('delete.confirmTitle')}
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            {eventToDelete
              ? t('delete.confirmDescription', {
                name: eventToDelete.event.name,
                count: eventToDelete.allRaceCount,
              })
              : null}
          </p>
          {eventToDelete && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
              {eventToDelete.event.name}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setEventToDelete(null)}
              disabled={isDeleting}
            >
              {t('delete.cancelButton')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
              loadingText={t('delete.deleting')}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {t('delete.confirmButton')}
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
