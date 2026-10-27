'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';
import Link from 'next/link';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { SectionHeader } from '@/components/ui/section-header';
import { ListEmptyState } from '@/components/ui/list-empty-state';
import { EventImportDraftRow } from '@/components/admin/event-import-draft-row';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
} from '@/components/ui/table';
import { EventRacesEditModal } from '@/components/admin/event-races-edit-modal';
import { AdminListSearch } from '@/components/admin/admin-list-search';
import {
  acceptEventImportDraft,
  getEventImportDraftPublicationStatus,
  rejectEventImportDraft,
  updateEventImportDraft,
} from '@/lib/api/events';
import type { EventRaceWriteInput } from '@/lib/api/events';
import type { TrailEventAgentEvent } from '@/types/trail-event-agent.types';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { buildEventImportDraftsHref } from '@/lib/event-import/draft-pagination';
import type {
  EventImportDraft,
  EventImportDraftPage,
  EventImportDraftPageRequest,
  EventImportDraftSortColumn,
  EventImportDraftStatus,
} from '@/types/event-import-draft.types';

interface AdminEventImportDraftsContentProps {
  initialPage: EventImportDraftPage;
  query: EventImportDraftPageRequest;
}

function hasCompleteInformation(draft: EventImportDraft, today: string): boolean {
  return Boolean(draft.data.event.description?.trim())
    && draft.data.races.length > 0
    && draft.data.races.every((race) => {
      const date = race.date;
      const timestamp = date ? Date.parse(`${date}T00:00:00Z`) : NaN;

      return date !== null
        && /^\d{4}-\d{2}-\d{2}$/.test(date)
        && Number.isFinite(timestamp)
        && new Date(timestamp).toISOString().slice(0, 10) === date
        && date > today
        && Number.isFinite(race.distanceKm)
        && race.distanceKm > 0
        && race.elevationGainM !== null
        && Number.isInteger(race.elevationGainM)
        && race.elevationGainM > 0;
    });
}

function DraftSortIcon({
  column,
  query,
}: {
  column: EventImportDraftSortColumn;
  query: EventImportDraftPageRequest;
}): React.ReactElement {
  if (column !== query.sortColumn) {
    return <ChevronsUpDown className="size-3.5 text-gray-300" strokeWidth={1.5} />;
  }

  return query.sortDirection === 'asc'
    ? <ChevronUp className="size-3.5" strokeWidth={2} />
    : <ChevronDown className="size-3.5" strokeWidth={2} />;
}

export function AdminEventImportDraftsContent({
  initialPage,
  query,
}: AdminEventImportDraftsContentProps): React.ReactElement {
  const t = useTranslations('admin.events.drafts');
  const eventsT = useTranslations('adminEvents');
  const locale = useLocale();
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [drafts, setDrafts] = useState(initialPage.drafts);
  const total = Math.max(0, initialPage.total - drafts.filter((draft) => draft.status !== 'draft').length);
  const [draftToPreview, setDraftToPreview] = useState<EventImportDraft | null>(null);
  const [draftToEdit, setDraftToEdit] = useState<EventImportDraft | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<EventImportDraft | null>(null);
  const [acceptingDraftId, setAcceptingDraftId] = useState<string | null>(null);
  const [publicationJobs, setPublicationJobs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialPage.drafts.flatMap((draft) =>
      draft.publication?.status === 'pending' || draft.publication?.status === 'running'
        ? [[draft.id, draft.publication.jobId]]
        : [],
    )),
  );
  const [failedPublications, setFailedPublications] = useState<Record<string, true>>(() =>
    Object.fromEntries(initialPage.drafts.flatMap((draft) =>
      draft.publication?.status === 'failed' ? [[draft.id, true]] : [],
    )),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const draftCount = total === 1
    ? t('draftCountOne')
    : t('draftCount', { count: total });

  const getSortHref = (column: EventImportDraftSortColumn): string => {
    const sortDirection = query.sortColumn === column && query.sortDirection === 'asc'
      ? 'desc'
      : 'asc';

    return buildEventImportDraftsHref(locale, {
      ...query,
      page: 1,
      sortColumn: column,
      sortDirection,
    });
  };

  const completeDraft = useCallback((draftId: string, status: Exclude<EventImportDraftStatus, 'draft'>): void => {
    setDrafts((current) => current.map((draft) =>
      draft.id === draftId && draft.status === 'draft' ? { ...draft, status } : draft,
    ));
    setDraftToPreview((current) => current?.id === draftId ? null : current);
    setDraftToEdit((current) => current?.id === draftId ? null : current);
    setDraftToDelete((current) => current?.id === draftId ? null : current);
  }, []);

  const handleAccept = async (draft: EventImportDraft): Promise<void> => {
    if (acceptingDraftId || draft.status !== 'draft') return;
    setAcceptingDraftId(draft.id);
    try {
      const result = await acceptEventImportDraft(draft.id);
      if (result.status === 'accepted') {
        completeDraft(draft.id, 'accepted');
        toast.success(t('acceptSuccess'));
      } else {
        setFailedPublications((current) => {
          const next = { ...current };
          delete next[draft.id];
          return next;
        });
        setPublicationJobs((current) => ({ ...current, [draft.id]: result.jobId }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('acceptError'));
    } finally {
      setAcceptingDraftId(null);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!draftToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await rejectEventImportDraft(draftToDelete.id);
      completeDraft(draftToDelete.id, 'rejected');
      toast.success(t('rejectSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('rejectError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (
    event: TrailEventAgentEvent,
    races: EventRaceWriteInput[],
  ): Promise<void> => {
    if (!draftToEdit || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateEventImportDraft(draftToEdit.id, { event, races });
      setDrafts((current) => current.map((draft) => draft.id === updated.id ? updated : draft));
      setPublicationJobs((current) => {
        const next = { ...current };
        delete next[updated.id];
        return next;
      });
      setFailedPublications((current) => {
        const next = { ...current };
        delete next[updated.id];
        return next;
      });
      setDraftToEdit(null);
      toast.success(t('saveSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveError'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    const entries = Object.entries(publicationJobs);
    if (entries.length === 0) return;

    let cancelled = false;
    const poll = async (): Promise<void> => {
      const results = await Promise.all(entries.map(async ([draftId, jobId]) => ({
        draftId,
        snapshot: await getEventImportDraftPublicationStatus({ draftId, jobId }),
      })));

      if (cancelled) return;

      for (const { draftId, snapshot } of results) {
        if (snapshot.job.status === 'completed') {
          completeDraft(draftId, 'accepted');
          setPublicationJobs((current) => {
            const next = { ...current };
            delete next[draftId];
            return next;
          });
          setFailedPublications((current) => {
            const next = { ...current };
            delete next[draftId];
            return next;
          });
          toast.success(t('acceptSuccess'));
        }
        if (snapshot.job.status === 'failed') {
          setPublicationJobs((current) => {
            const next = { ...current };
            delete next[draftId];
            return next;
          });
          setFailedPublications((current) => ({ ...current, [draftId]: true }));
          toast.error(t('acceptError'));
        }
      }
    };

    void poll().catch(() => {
      if (!cancelled) toast.error(t('acceptError'));
    });
    const intervalId = window.setInterval(() => {
      void poll().catch(() => {
        if (!cancelled) toast.error(t('acceptError'));
      });
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [publicationJobs, completeDraft, t]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title={t('title')} subtitle={draftCount} />
      <AdminListSearch
        action={`/${locale}/admin/eventos/borradores`}
        inputId="admin-event-draft-search"
        initialQuery={query.search}
        label={t('search.placeholder')}
      />
      {drafts.length === 0 ? (
        <ListEmptyState message={query.search ? t('search.empty') : t('empty')} />
      ) : (
        <Table>
            <TableHeader>
              <TableCell header>
                <Link href={getSortHref('name')} className="inline-flex items-center gap-1 transition-colors hover:text-gray-800">
                  {eventsT('columns.name')}
                  <DraftSortIcon column="name" query={query} />
                </Link>
              </TableCell>
              <TableCell header>{eventsT('columns.website')}</TableCell>
              <TableCell header align="right">
                <Link href={getSortHref('races')} className="inline-flex items-center gap-1 transition-colors hover:text-gray-800">
                  {eventsT('columns.races')}
                  <DraftSortIcon column="races" query={query} />
                </Link>
              </TableCell>
              <TableCell header>
                <Link href={getSortHref('dates')} className="inline-flex items-center gap-1 transition-colors hover:text-gray-800">
                  {eventsT('columns.dates')}
                  <DraftSortIcon column="dates" query={query} />
                </Link>
              </TableCell>
              <TableCell header align="right">{eventsT('columns.actions')}</TableCell>
            </TableHeader>
            <TableBody>
              {drafts.map((draft) => (
                <EventImportDraftRow
                  key={draft.id}
                  draft={draft}
                  isComplete={hasCompleteInformation(draft, today)}
                  isPublishing={draft.status === 'draft' && publicationJobs[draft.id] !== undefined}
                  hasFailedPublication={failedPublications[draft.id] === true}
                  acceptDisabled={acceptingDraftId !== null}
                  onPreview={() => setDraftToPreview(draft)}
                  onAccept={() => void handleAccept(draft)}
                  onEdit={() => setDraftToEdit(draft)}
                  onDelete={() => setDraftToDelete(draft)}
                />
              ))}
            </TableBody>
        </Table>
      )}

      {initialPage.totalPages > 1 ? (
        <AdminPagination
          page={initialPage.page}
          totalPages={initialPage.totalPages}
          getHref={(page) => buildEventImportDraftsHref(locale, {
            ...query,
            page,
          })}
        />
      ) : null}
      <EventImportPreviewModal
        isOpen={draftToPreview !== null}
        closeLabel={t('closePreview')}
        onClose={() => setDraftToPreview(null)}
      >
        <EventImportPreview
          event={draftToPreview?.data.event ?? null}
          races={draftToPreview?.data.races ?? []}
          isLoading={false}
          error={null}
          onAccept={async () => undefined}
          isAccepted={false}
          isAccepting={false}
          onReject={() => undefined}
          isRejected={false}
          onSaveReview={async () => undefined}
          readOnly
        />
      </EventImportPreviewModal>
      <EventRacesEditModal
        isOpen={draftToEdit !== null}
        event={draftToEdit?.data.event ?? null}
        races={draftToEdit?.data.races ?? []}
        title={t('edit')}
        isSaving={isSavingEdit}
        onClose={() => {
          if (!isSavingEdit) setDraftToEdit(null);
        }}
        onSave={handleSave}
        showTiers
      />
      <ConfirmationModal
        isOpen={draftToDelete !== null}
        onClose={() => {
          if (!isDeleting) setDraftToDelete(null);
        }}
        onConfirm={() => void handleDelete()}
        title={t('delete.confirmTitle')}
        message={draftToDelete ? t('delete.confirmDescription', { name: draftToDelete.data.event.name }) : ''}
        highlight={draftToDelete?.data.event.name}
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
