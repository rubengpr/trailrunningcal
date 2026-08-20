'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Check, Search, TextCursor, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EventRacesEditModal } from '@/components/admin/event-races-edit-modal';
import {
  acceptEventImportDraft,
  rejectEventImportDraft,
  updateEventImportDraft,
} from '@/lib/api/events';
import type { EventRaceWriteInput } from '@/lib/api/events';
import type { EventImportDraft } from '@/types/event-import-draft.types';
import type { TrailEventAgentEvent } from '@/types/trail-event-agent.types';
import { formatEventDateRangeNumeric } from '@/lib/events/utils';
import { cleanUrl } from '@/lib/utils/url';

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
  const [draftToEdit, setDraftToEdit] = useState<EventImportDraft | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<EventImportDraft | null>(null);
  const [acceptingDraftId, setAcceptingDraftId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const draftCount = drafts.length === 1
    ? t('draftCountOne')
    : t('draftCount', { count: drafts.length });

  const removeDraft = (draftId: string): void => {
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
    setDraftToEdit((current) => current?.id === draftId ? null : current);
    setDraftToDelete((current) => current?.id === draftId ? null : current);
  };

  const handleAccept = async (draft: EventImportDraft): Promise<void> => {
    if (acceptingDraftId) return;
    setAcceptingDraftId(draft.id);
    try {
      await acceptEventImportDraft(draft.id);
      removeDraft(draft.id);
      toast.success(t('acceptSuccess'));
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
      setDraftToEdit(null);
      toast.success(t('saveSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveError'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title={t('title')} subtitle={draftCount} />
      <form
        action={`/${locale}/admin/eventos/borradores`}
        method="get"
        className="relative ml-auto flex w-full max-w-64"
      >
        <label htmlFor="admin-event-draft-search" className="sr-only">
          {t('search.placeholder')}
        </label>
        <Search
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
          strokeWidth={1.5}
        />
        <input
          id="admin-event-draft-search"
          key={search}
          type="search"
          name="q"
          defaultValue={search}
          maxLength={200}
          className="h-10 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-normal text-gray-900 outline-none transition-colors focus:border-gray-500 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </form>
      {drafts.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {search ? t('search.empty') : t('empty')}
        </p>
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
              {drafts.map((draft) => (
                <TableRow key={draft.id} className="align-middle transition-colors duration-150 hover:bg-gray-100">
                  <TableCell className="max-w-[200px]">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {draft.data.event.name}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    {draft.sourceUrl ? (
                      <a
                        href={draft.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm text-gray-500 hover:text-gray-800 hover:underline"
                      >
                        {cleanUrl(draft.sourceUrl)}
                      </a>
                    ) : (
                      <span className="text-sm text-red-600">{eventsT('missingUrl')}</span>
                    )}
                  </TableCell>
                  <TableCell align="right" className="text-sm tabular-nums text-gray-700">
                    {draft.data.races.length}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {formatEventDateRangeNumeric(getDraftDateRange(draft), eventsT('noDates'))}
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void handleAccept(draft)}
                        disabled={acceptingDraftId !== null}
                        title={t('accept')}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-green-700 disabled:pointer-events-none disabled:opacity-35"
                      >
                        <Check className="size-4" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftToEdit(draft)}
                        title={t('edit')}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800"
                      >
                        <TextCursor className="size-4" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftToDelete(draft)}
                        title={t('delete.button')}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-700"
                      >
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
      )}
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
