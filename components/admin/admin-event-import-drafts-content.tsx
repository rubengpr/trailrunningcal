'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Check, CircleAlert, Eye, LoaderCircle, TextCursor, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { SectionHeader } from '@/components/ui/section-header';
import { TableActionButton } from '@/components/ui/table-action-button';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EventRacesEditModal } from '@/components/admin/event-races-edit-modal';
import { AdminListEmptyState } from '@/components/admin/admin-list-empty-state';
import { AdminListSearch } from '@/components/admin/admin-list-search';
import { EventWebsiteTableCell } from '@/components/event/event-website-table-cell';
import {
  acceptEventImportDraft,
  getEventImportDraftPublicationStatus,
  rejectEventImportDraft,
  updateEventImportDraft,
} from '@/lib/api/events';
import type { EventRaceWriteInput } from '@/lib/api/events';
import type { EventImportDraft } from '@/types/event-import-draft.types';
import type { TrailEventAgentEvent } from '@/types/trail-event-agent.types';
import { formatEventDateRangeNumeric } from '@/lib/events/utils';

interface AdminEventImportDraftsContentProps {
  initialDrafts: EventImportDraft[];
  search: string;
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

export function AdminEventImportDraftsContent({
  initialDrafts,
  search,
}: AdminEventImportDraftsContentProps): React.ReactElement {
  const t = useTranslations('admin.events.drafts');
  const eventsT = useTranslations('adminEvents');
  const locale = useLocale();
  const [drafts, setDrafts] = useState(initialDrafts);
  const [draftToPreview, setDraftToPreview] = useState<EventImportDraft | null>(null);
  const [draftToEdit, setDraftToEdit] = useState<EventImportDraft | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<EventImportDraft | null>(null);
  const [acceptingDraftId, setAcceptingDraftId] = useState<string | null>(null);
  const [publicationJobs, setPublicationJobs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialDrafts.flatMap((draft) =>
      draft.publication?.status === 'pending' || draft.publication?.status === 'running'
        ? [[draft.id, draft.publication.jobId]]
        : [],
    )),
  );
  const [failedPublications, setFailedPublications] = useState<Record<string, true>>(() =>
    Object.fromEntries(initialDrafts.flatMap((draft) =>
      draft.publication?.status === 'failed' ? [[draft.id, true]] : [],
    )),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const draftCount = drafts.length === 1
    ? t('draftCountOne')
    : t('draftCount', { count: drafts.length });

  const removeDraft = useCallback((draftId: string): void => {
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
    setDraftToPreview((current) => current?.id === draftId ? null : current);
    setDraftToEdit((current) => current?.id === draftId ? null : current);
    setDraftToDelete((current) => current?.id === draftId ? null : current);
  }, []);

  const handleAccept = async (draft: EventImportDraft): Promise<void> => {
    if (acceptingDraftId) return;
    setAcceptingDraftId(draft.id);
    try {
      const result = await acceptEventImportDraft(draft.id);
      if (result.status === 'accepted') {
        removeDraft(draft.id);
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
      removeDraft(draftToDelete.id);
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
          removeDraft(draftId);
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
  }, [publicationJobs, removeDraft, t]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title={t('title')} subtitle={draftCount} />
      <AdminListSearch
        action={`/${locale}/admin/eventos/borradores`}
        inputId="admin-event-draft-search"
        initialQuery={search}
        label={t('search.placeholder')}
      />
      {drafts.length === 0 ? (
        <AdminListEmptyState message={search ? t('search.empty') : t('empty')} />
      ) : (
        <Table>
            <TableHeader>
              <TableCell header>{eventsT('columns.name')}</TableCell>
              <TableCell header>{eventsT('columns.website')}</TableCell>
              <TableCell header align="right">{eventsT('columns.races')}</TableCell>
              <TableCell header>{eventsT('columns.dates')}</TableCell>
              <TableCell header align="right">{eventsT('columns.actions')}</TableCell>
            </TableHeader>
            <TableBody>
              {drafts.map((draft) => {
                const isPublishing = publicationJobs[draft.id] !== undefined;
                const hasFailedPublication = failedPublications[draft.id] === true;
                return (
                  <TableRow key={draft.id} className="align-middle transition-colors duration-150 hover:bg-gray-100">
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
                  <TableCell align="right">
                    <div className="flex justify-end gap-1">
                      {hasFailedPublication ? (
                        <span className="mt-2" title={t('acceptError')}>
                          <CircleAlert className="size-4 text-red-600" strokeWidth={1.5} />
                        </span>
                      ) : null}
                      <TableActionButton
                        onClick={() => setDraftToPreview(draft)}
                        title={t('view')}
                      >
                        <Eye className="size-4" strokeWidth={1.5} />
                      </TableActionButton>
                      <TableActionButton
                        onClick={() => void handleAccept(draft)}
                        disabled={acceptingDraftId !== null || isPublishing}
                        title={t('accept')}
                        tone="success"
                      >
                        {isPublishing
                          ? <LoaderCircle className="size-4 animate-spin" strokeWidth={1.5} />
                          : <Check className="size-4" strokeWidth={1.5} />}
                      </TableActionButton>
                      <TableActionButton
                        onClick={() => setDraftToEdit(draft)}
                        title={t('edit')}
                      >
                        <TextCursor className="size-4" strokeWidth={1.5} />
                      </TableActionButton>
                      <TableActionButton
                        onClick={() => setDraftToDelete(draft)}
                        title={t('delete.button')}
                        tone="destructive"
                      >
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </TableActionButton>
                    </div>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
        </Table>
      )}
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
