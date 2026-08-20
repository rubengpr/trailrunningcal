'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Eye } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';
import {
  acceptEventImportDraft,
  rejectEventImportDraft,
  updateEventImportDraft,
} from '@/lib/api/events';
import type { EventImportDraft } from '@/types/event-import-draft.types';
import type { TrailEventAgentEvent, TrailEventAgentRace } from '@/types/trail-event-agent.types';
import { formatEventDateRangeNumeric } from '@/lib/events/utils';
import { cleanUrl } from '@/lib/utils/url';

interface AdminEventImportDraftsContentProps {
  initialDrafts: EventImportDraft[];
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

export function AdminEventImportDraftsContent({ initialDrafts }: AdminEventImportDraftsContentProps): React.ReactElement {
  const t = useTranslations('admin.events.drafts');
  const eventsT = useTranslations('adminEvents');
  const [drafts, setDrafts] = useState(initialDrafts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const selected = drafts.find((draft) => draft.id === selectedId) ?? null;

  const removeSelected = (): void => {
    if (!selectedId) return;
    setDrafts((current) => current.filter((draft) => draft.id !== selectedId));
    setSelectedId(null);
  };

  const handleAccept = async (): Promise<void> => {
    if (!selected || isAccepting) return;
    setIsAccepting(true);
    try {
      await acceptEventImportDraft(selected.id);
      removeSelected();
      toast.success(t('acceptSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('acceptError'));
    } finally { setIsAccepting(false); }
  };

  const handleReject = async (): Promise<void> => {
    if (!selected) return;
    try {
      await rejectEventImportDraft(selected.id);
      removeSelected();
      toast.success(t('rejectSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('rejectError'));
    }
  };

  const handleSave = async (event: TrailEventAgentEvent, races: TrailEventAgentRace[]): Promise<void> => {
    if (!selected) return;
    const updated = await updateEventImportDraft(selected.id, { event, races });
    setDrafts((current) => current.map((draft) => draft.id === updated.id ? updated : draft));
    toast.success(t('saveSuccess'));
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title={t('title')} subtitle={t('subtitle')} />
      {drafts.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">{t('empty')}</p>
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
                <button
                  type="button"
                  onClick={() => setSelectedId(draft.id)}
                  title={t('open')}
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  <Eye className="size-4" strokeWidth={1.5} />
                </button>
              </TableCell>
            </TableRow>
          ))}
          </TableBody>
        </Table>
      )}
      <EventImportPreviewModal isOpen={selected !== null} closeLabel={t('close')} onClose={() => setSelectedId(null)}>
        {selected && (
          <EventImportPreview
            event={selected.data.event}
            races={selected.data.races}
            isLoading={false}
            error={null}
            onAccept={handleAccept}
            isAccepted={false}
            isAccepting={isAccepting}
            onReject={() => void handleReject()}
            isRejected={false}
            onSaveReview={handleSave}
          />
        )}
      </EventImportPreviewModal>
    </div>
  );
}
