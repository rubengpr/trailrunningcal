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
import { EventRacesEditModal } from '@/components/admin/event-races-edit-modal';
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
import { cleanUrl } from '@/lib/utils/url';
import type { AdminTrailEventDetail, TrailEventDetail } from '@/types/event.types';
import type { EventDraft } from '@/types/event-draft.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface AdminEventsContentProps {
  events: AdminTrailEventDetail[];
}

type SortColumn = 'name' | 'dates';
type SortDirection = 'asc' | 'desc';

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

export function AdminEventsContent({ events }: AdminEventsContentProps) {
  const t = useTranslations('adminEvents');
  const formT = useTranslations('adminEvents.form');
  const locale = useLocale();
  const router = useRouter();
  const [eventToDelete, setEventToDelete] = useState<TrailEventDetail | null>(null);
  const [eventToEdit, setEventToEdit] = useState<TrailEventDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [generatingDraftEventIds, setGeneratingDraftEventIds] = useState<Set<string>>(new Set());
  const [pendingDraftsByEventId, setPendingDraftsByEventId] = useState<
    Record<string, EventDraft>
  >(() => getPendingDraftsByEventId(events));
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);
  const [acceptingDraftId, setAcceptingDraftId] = useState<string | null>(null);
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
    }));
  }, [eventToEdit]);

  useEffect(() => {
    setPendingDraftsByEventId(getPendingDraftsByEventId(events));
  }, [events]);

  useEffect(() => {
    if (!reviewEventId) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setReviewEventId(null);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [reviewEventId]);

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
      />

      {reviewEventDetail && reviewDraft && (
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
