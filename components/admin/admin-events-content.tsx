'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { ListEmptyState } from '@/components/ui/list-empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { AdminEventsTable } from '@/components/admin/admin-events-table';
import { AdminEventsPagination } from '@/components/admin/admin-events-pagination';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';
import { EventRacesEditModal } from '@/components/admin/event-races-edit-modal';
import { AdminEventsFilters } from '@/components/admin/admin-events-filters';
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
import type { AdminTrailEventDetail, TrailEventDetail } from '@/types/event.types';
import type { EventDraft } from '@/types/event-draft.types';
import type { AdminEventPage, AdminEventPageRequest } from '@/types/admin-events.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface AdminEventsContentProps {
  page: AdminEventPage;
  query: AdminEventPageRequest;
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
            <Button variant="secondary" onClick={() => router.push(`/${locale}/admin/eventos/actualizaciones`)}>
              {t('automaticUpdates')}
            </Button>
            <Button onClick={() => router.push(`/${locale}/admin/eventos/descripciones`)}>
              {t('generateDescriptions')}
            </Button>
          </div>
        }
      />

      <AdminEventsFilters
        action={`/${locale}/admin/eventos/activos`}
        inputId="admin-event-search"
        initialQuery={query.search}
        initialProvince={query.province}
        hiddenFields={{
          sort: query.sortColumn !== 'dates' ? query.sortColumn : undefined,
          direction: query.sortDirection !== 'asc' ? query.sortDirection : undefined,
        }}
      />

      {events.length === 0 ? (
        <ListEmptyState message={query.search
          ? t('search.empty')
          : query.province
            ? t('filters.emptyProvince', { province: query.province })
            : t('empty')} />
      ) : (
        <AdminEventsTable
          events={events}
          locale={locale}
          query={query}
          pendingDraftsByEventId={pendingDraftsByEventId}
          generatingDraftEventIds={generatingDraftEventIds}
          isDeleting={isDeleting}
          onReview={setReviewEventId}
          onGenerateDraft={(eventDetail) => void handleGenerateDraft(eventDetail)}
          onEdit={setEventToEdit}
          onDelete={setEventToDelete}
        />
      )}

      {totalPages > 1 ? (
        <AdminEventsPagination
          page={page.page}
          totalPages={totalPages}
          query={query}
          locale={locale}
        />
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
