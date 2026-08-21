'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  RefreshCw,
  TextCursor,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';
import { EventRacesEditModal } from '@/components/admin/event-races-edit-modal';
import { AdminListEmptyState } from '@/components/admin/admin-list-empty-state';
import { AdminListSearch } from '@/components/admin/admin-list-search';
import { EventWebsiteTableCell } from '@/components/event/event-website-table-cell';
import {
  deleteEvent,
  updateEvent,
} from '@/lib/api/events';
import type { EventRaceWriteInput } from '@/lib/api/events';
import {
  acceptEventDraft,
  generateEventDraft,
  rejectEventDraft,
  updateEventDraft,
} from '@/lib/api/event-drafts';
import { formatEventDateRangeNumeric } from '@/lib/events/utils';
import { buildAdminEventsHref } from '@/lib/events/admin-pagination';
import type { AdminTrailEventDetail, TrailEventDetail } from '@/types/event.types';
import type { EventDraft } from '@/types/event-draft.types';
import type {
  AdminEventPage,
  AdminEventPageRequest,
  AdminEventSortColumn,
} from '@/types/admin-events.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface AdminEventsContentProps {
  page: AdminEventPage;
  query: AdminEventPageRequest;
}

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

function getPaginationItems(page: number, totalPages: number): PaginationItem[] {
  const visiblePages = new Set([1, totalPages]);

  for (let candidate = page - 2; candidate <= page + 2; candidate += 1) {
    if (candidate >= 1 && candidate <= totalPages) {
      visiblePages.add(candidate);
    }
  }

  const pages = [...visiblePages].sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  for (const [index, visiblePage] of pages.entries()) {
    const previousPage = pages[index - 1];
    if (previousPage !== undefined && visiblePage - previousPage > 1) {
      items.push(index === 1 ? 'start-ellipsis' : 'end-ellipsis');
    }
    items.push(visiblePage);
  }

  return items;
}

function getPendingDraftsByEventId(
  events: AdminTrailEventDetail[],
): Record<string, EventDraft> {
  return Object.fromEntries(
    events.flatMap((eventDetail) => {
      const draft = eventDetail.pendingDraft;
      return draft ? [[eventDetail.event.id, draft]] : [];
    }),
  );
}

export function AdminEventsContent({ page, query }: AdminEventsContentProps) {
  const t = useTranslations('adminEvents');
  const formT = useTranslations('adminEvents.form');
  const locale = useLocale();
  const router = useRouter();
  const { events, total, totalPages } = page;
  const [eventToDelete, setEventToDelete] = useState<TrailEventDetail | null>(null);
  const [eventToEdit, setEventToEdit] = useState<AdminTrailEventDetail | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [generatingDraftEventIds, setGeneratingDraftEventIds] = useState<Set<string>>(new Set());
  const [pendingDraftsByEventId, setPendingDraftsByEventId] = useState<
    Record<string, EventDraft>
  >(() => getPendingDraftsByEventId(events));
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);
  const [acceptingDraftId, setAcceptingDraftId] = useState<string | null>(null);
  const subtitle = total === 1
    ? t('eventCountOne')
    : t('eventCount', { count: total });

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

  const paginationItems = getPaginationItems(page.page, totalPages);

  const reviewEventDetail = reviewEventId
    ? events.find((eventDetail) => eventDetail.event.id === reviewEventId) ?? null
    : null;
  const reviewDraft = reviewEventId
    ? pendingDraftsByEventId[reviewEventId] ?? null
    : null;
  const editModalEvent = useMemo<TrailEventAgentEvent | null>(() => {
    if (!eventToEdit) return null;

    return {
      name: eventToEdit.event.name,
      description: eventToEdit.event.description,
      websiteUrl: eventToEdit.event.websiteUrl,
    };
  }, [eventToEdit]);
  const editModalRaces = useMemo<EventRaceWriteInput[]>(() => {
    if (!eventToEdit) return [];

    return eventToEdit.races.map((race) => ({
      id: race.id,
      name: race.name,
      date: race.date,
      city: race.city,
      province: race.province,
      distanceKm: race.distanceKm,
      elevationGainM: race.elevationGainM,
      resultsUrl: race.resultsUrl,
      tiers: race.tiers.map(({ priceEur, endsAt }) => ({
        priceEur,
        endsAt,
      })),
    }));
  }, [eventToEdit]);

  useEffect(() => {
    setPendingDraftsByEventId(getPendingDraftsByEventId(events));
  }, [events]);

  const setDraftGenerating = (eventId: string, isGenerating: boolean): void => {
    setGeneratingDraftEventIds((ids) => {
      const nextIds = new Set(ids);
      if (isGenerating) {
        nextIds.add(eventId);
      } else {
        nextIds.delete(eventId);
      }
      return nextIds;
    });
  };

  const handleGenerateDraft = async (
    eventDetail: TrailEventDetail,
  ): Promise<void> => {
    if (!eventDetail.event.websiteUrl) {
      toast.error(t('updateSuggestion.missingUrl'));
      return;
    }

    const eventId = eventDetail.event.id;
    if (pendingDraftsByEventId[eventId]) {
      setReviewEventId(eventId);
      return;
    }

    setDraftGenerating(eventId, true);

    try {
      const draft = await generateEventDraft(eventId);
      setPendingDraftsByEventId((current) => ({
        ...current,
        [eventId]: draft,
      }));
      setReviewEventId(eventId);
      toast.success(t('updateSuggestion.extractSuccess'));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('updateSuggestion.extractError'),
      );
    } finally {
      setDraftGenerating(eventId, false);
    }
  };

  const handleSaveDraftReview = async (
    eventId: string,
    event: TrailEventAgentEvent,
    races: TrailEventAgentRace[],
  ): Promise<void> => {
    const draft = pendingDraftsByEventId[eventId];
    if (!draft) return;

    try {
      const updatedDraft = await updateEventDraft(draft.id, {
        event,
        races,
      });
      setPendingDraftsByEventId((current) => ({
        ...current,
        [eventId]: updatedDraft,
      }));
      toast.success(t('updateSuggestion.saveSuccess'));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('updateSuggestion.saveError'),
      );
      throw error;
    }
  };

  const handleRejectDraft = async (eventId: string): Promise<void> => {
    const draft = pendingDraftsByEventId[eventId];
    if (!draft) return;

    try {
      await rejectEventDraft(draft.id);
      setPendingDraftsByEventId((current) => {
        const remaining = { ...current };
        delete remaining[eventId];
        return remaining;
      });
      setReviewEventId(null);
      toast.success(t('updateSuggestion.rejectSuccess'));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('updateSuggestion.rejectError'),
      );
    }
  };

  const handleAcceptDraft = async (eventId: string): Promise<void> => {
    const draft = pendingDraftsByEventId[eventId];
    if (!draft) return;

    setAcceptingDraftId(draft.id);
    try {
      await acceptEventDraft(draft.id);
      setPendingDraftsByEventId((current) => {
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
      setAcceptingDraftId(null);
    }
  };

  const handleSaveEdit = async (
    event: TrailEventAgentEvent,
    races: EventRaceWriteInput[],
  ): Promise<void> => {
    if (!eventToEdit || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      await updateEvent(eventToEdit.event.id, event, races);
      setEventToEdit(null);
      toast.success(formT('success'));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : formT('errors.save'),
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTrackUploaded = (raceId: string): void => {
    setEventToEdit((current) => {
      if (!current || current.trackedRaceIds.includes(raceId)) return current;
      return {
        ...current,
        trackedRaceIds: [...current.trackedRaceIds, raceId],
      };
    });
    router.refresh();
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

      <AdminListSearch
        action={`/${locale}/admin/eventos/activos`}
        inputId="admin-event-search"
        initialQuery={query.search}
        label={t('search.placeholder')}
        hiddenFields={{
          sort: query.sortColumn !== 'dates' ? query.sortColumn : undefined,
          direction: query.sortDirection !== 'asc' ? query.sortDirection : undefined,
        }}
      />

      {events.length === 0 ? (
        <AdminListEmptyState message={query.search ? t('search.empty') : t('empty')} />
      ) : (
        <Table>
          <TableHeader>
            <TableCell header>
              <Link
                href={getSortHref('name')}
                className="inline-flex items-center gap-1 transition-colors hover:text-gray-800"
              >
                {t('columns.name')}
                {renderSortIcon('name')}
              </Link>
            </TableCell>
            <TableCell header>{t('columns.website')}</TableCell>
            <TableCell header align="right">{t('columns.races')}</TableCell>
            <TableCell header>
              <Link
                href={getSortHref('dates')}
                className="inline-flex items-center gap-1 transition-colors hover:text-gray-800"
              >
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
                <TableRow
                  key={event.id}
                  className={`align-middle transition-colors duration-150 hover:bg-gray-100 ${
                    hasPendingDraft ? 'bg-amber-50/35' : ''
                  }`}
                >
                  <TableCell className="max-w-[200px]">
                    <div className="flex min-w-0 items-center gap-2">
                      {hasPendingDraft && (
                        <span
                          title={t('updateSuggestion.pendingDraft')}
                          className="size-1.5 shrink-0 rounded-full bg-amber-500"
                        />
                      )}
                      <Link
                        href={`/${locale}/e/${event.slug}`}
                        prefetch={false}
                        className="block min-w-0 truncate text-sm font-medium text-gray-900 hover:underline"
                      >
                        {event.name}
                      </Link>
                    </div>
                  </TableCell>
                  <EventWebsiteTableCell
                    url={event.websiteUrl}
                    missingLabel={t('missingUrl')}
                    missingClassName="text-sm text-red-600"
                  />
                  <TableCell align="right" className="text-sm tabular-nums text-gray-700">
                    {eventDetail.allRaceCount}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {formatEventDateRangeNumeric(eventDetail.dateRange, t('noDates'))}
                  </TableCell>
                  <TableCell align="right">
                    <div className="inline-flex items-center justify-end gap-1">
                      {hasPendingDraft && (
                        <button
                          type="button"
                          onClick={() => setReviewEventId(event.id)}
                          title={t('updateSuggestion.reviewPendingDraft')}
                          className="inline-flex size-8 cursor-pointer items-center justify-center rounded text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-700"
                        >
                          <Eye className="size-4" strokeWidth={1.5} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleGenerateDraft(eventDetail)}
                        disabled={!event.websiteUrl || isGeneratingDraft || hasPendingDraft}
                        title={
                          hasPendingDraft
                            ? t('updateSuggestion.reviewPendingDraft')
                            : event.websiteUrl
                              ? t('updateSuggestion.button')
                              : t('updateSuggestion.missingUrl')
                        }
                        className="inline-flex size-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                      >
                        <RefreshCw
                          className={`size-4 ${isGeneratingDraft ? 'animate-spin' : ''}`}
                          strokeWidth={1.5}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventToEdit(eventDetail)}
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

      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-1">
          {page.page > 1 ? (
            <Link
              href={buildAdminEventsHref(locale, {
                ...query,
                page: page.page - 1,
              })}
              title={t('pagination.previous')}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
              <ChevronLeft className="size-4" />
            </span>
          )}

          {paginationItems.map((item) =>
            typeof item === 'number' ? (
              item === page.page ? (
                <span
                  key={item}
                  className="inline-flex size-9 items-center justify-center rounded-lg bg-black text-sm font-medium text-white"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildAdminEventsHref(locale, { ...query, page: item })}
                  title={t('pagination.page', { page: item })}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {item}
                </Link>
              )
            ) : (
              <span
                key={item}
                className="inline-flex size-9 items-center justify-center text-sm text-gray-400"
              >
                …
              </span>
            ),
          )}

          {page.page < totalPages ? (
            <Link
              href={buildAdminEventsHref(locale, {
                ...query,
                page: page.page + 1,
              })}
              title={t('pagination.next')}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
              <ChevronRight className="size-4" />
            </span>
          )}
        </nav>
      ) : null}

      <EventRacesEditModal
        isOpen={eventToEdit !== null}
        event={editModalEvent}
        races={editModalRaces}
        title={formT('editTitle')}
        isSaving={isSavingEdit}
        savingLabel={formT('saving')}
        onClose={() => {
          if (!isSavingEdit) setEventToEdit(null);
        }}
        onSave={handleSaveEdit}
        showTiers
        showTrackUploads
        showResultsUrls
        trackedRaceIds={eventToEdit?.trackedRaceIds ?? []}
        onTrackUploaded={handleTrackUploaded}
      />

      {reviewEventDetail && reviewDraft && (
        <EventImportPreviewModal
          isOpen
          closeLabel={t('updateSuggestion.closeButton')}
          onClose={() => setReviewEventId(null)}
        >
          <EventImportPreview
            event={reviewDraft.data.event}
            races={reviewDraft.data.races}
            isLoading={false}
            error={null}
            onAccept={() => handleAcceptDraft(reviewEventDetail.event.id)}
            isAccepted={false}
            isAccepting={acceptingDraftId === reviewDraft.id}
            onReject={() => void handleRejectDraft(reviewEventDetail.event.id)}
            isRejected={false}
            onSaveReview={(event, races) =>
              handleSaveDraftReview(reviewEventDetail.event.id, event, races)
            }
          />
        </EventImportPreviewModal>
      )}

      <ConfirmationModal
        isOpen={eventToDelete !== null}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={t('delete.confirmTitle')}
        message={
          eventToDelete
            ? t('delete.confirmDescription', {
              name: eventToDelete.event.name,
              count: eventToDelete.allRaceCount,
            })
            : ''
        }
        highlight={eventToDelete?.event.name}
        confirmButtonText={t('delete.confirmButton')}
        cancelButtonText={t('delete.cancelButton')}
        isSubmitting={isDeleting}
        loadingText={t('delete.deleting')}
        variant="destructive"
        maxWidth="md"
      />
    </div>
  );
}
