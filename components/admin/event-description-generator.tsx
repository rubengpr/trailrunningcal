'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { BaseModal } from '@/components/ui/base-modal';
import { SectionHeader } from '@/components/ui/section-header';
import { ListEmptyState } from '@/components/ui/list-empty-state';
import {
  EventDescriptionRow,
  type EventDescriptionRowStatus,
} from '@/components/admin/event-description-row';
import {
  OPENROUTER_SCRAPE_MODEL_IDS,
  type OpenRouterScrapeModelId,
} from '@/lib/integrations/openrouter/scrape-models';
import {
  generateEventDescriptionDraft,
  getEventDescriptionBatchStatus,
  getEventDescriptionItemResult,
  saveEventDescription,
  startEventDescriptionBatch,
} from '@/lib/api/events';
import type { TrailEventDetail } from '@/types/event.types';
import type { EventDescriptionBatchSnapshot } from '@/types/event-description.types';

interface EventDescriptionGeneratorProps {
  events: TrailEventDetail[];
}

type RowStatus = EventDescriptionRowStatus;

function getInitialDescriptions(events: TrailEventDetail[]): Record<string, string> {
  return Object.fromEntries(
    events.map((eventDetail) => [
      eventDetail.event.id,
      eventDetail.event.description ?? '',
    ]),
  );
}

function getInitialUpdatedAt(events: TrailEventDetail[]): Record<string, string | null> {
  return Object.fromEntries(
    events.map((eventDetail) => [
      eventDetail.event.id,
      eventDetail.event.updatedAt,
    ]),
  );
}

export function EventDescriptionGenerator({
  events,
}: EventDescriptionGeneratorProps) {
  const t = useTranslations('adminEventDescriptions');
  const locale = useLocale();
  const [model, setModel] = useState<OpenRouterScrapeModelId>(
    'openai/gpt-5.4-mini',
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentDescriptions, setCurrentDescriptions] = useState<Record<string, string>>(() =>
    getInitialDescriptions(events),
  );
  const [updatedAtByEventId, setUpdatedAtByEventId] = useState<Record<string, string | null>>(() =>
    getInitialUpdatedAt(events),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    ({}),
  );
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchSnapshot, setBatchSnapshot] =
    useState<EventDescriptionBatchSnapshot | null>(null);
  const [descriptionModalEventId, setDescriptionModalEventId] = useState<string | null>(null);
  const fetchedBatchItemIds = useRef<Set<string>>(new Set());

  const selectedCount = selectedIds.size;
  const isBatchRunning =
    batchSnapshot?.batch.status === 'pending' ||
    batchSnapshot?.batch.status === 'running';

  const selectedEventIds = useMemo(() => [...selectedIds], [selectedIds]);

  const selectableEvents = useMemo(
    () => events.filter((e) => !!e.event.websiteUrl),
    [events],
  );

  const allSelectableSelected =
    selectableEvents.length > 0 &&
    selectableEvents.every((e) => selectedIds.has(e.event.id));

  const toggleSelected = (eventId: string): void => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const toggleAll = (): void => {
    if (allSelectableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableEvents.map((e) => e.event.id)));
    }
  };

  const setRowStatus = (eventId: string, status: RowStatus): void => {
    setStatuses((current) => ({ ...current, [eventId]: status }));
  };

  const setRowError = (eventId: string, error: string | null): void => {
    setErrors((current) => {
      const next = { ...current };
      if (error) {
        next[eventId] = error;
      } else {
        delete next[eventId];
      }
      return next;
    });
  };

  const handleGenerateOne = async (eventId: string): Promise<void> => {
    setRowStatus(eventId, 'generating');
    setRowError(eventId, null);

    try {
      const result = await generateEventDescriptionDraft(eventId, model);
      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }
      setDrafts((current) => ({ ...current, [eventId]: result.description }));
      setRowStatus(eventId, 'ready');
      toast.success(t('generateSuccess'));
    } catch (error) {
      setRowStatus(eventId, 'failed');
      setRowError(
        eventId,
        error instanceof Error ? error.message : t('generateError'),
      );
      toast.error(t('generateError'));
    }
  };

  const handleSave = async (eventId: string): Promise<void> => {
    setRowStatus(eventId, 'saving');
    setRowError(eventId, null);

    try {
      const description = drafts[eventId] ?? currentDescriptions[eventId] ?? null;
      const savedEvent = await saveEventDescription(eventId, description);
      setCurrentDescriptions((current) => ({
        ...current,
        [eventId]: description ?? '',
      }));
      setUpdatedAtByEventId((current) => ({
        ...current,
        [eventId]: savedEvent.updatedAt,
      }));
      setDrafts((current) => {
        const next = { ...current };
        delete next[eventId];
        return next;
      });
      setRowStatus(eventId, 'saved');
      toast.success(t('saveSuccess'));
    } catch (error) {
      setRowStatus(eventId, 'failed');
      setRowError(eventId, error instanceof Error ? error.message : t('saveError'));
      toast.error(t('saveError'));
    }
  };

  const fetchBatchStatus = useCallback(
    async (batchId: string): Promise<EventDescriptionBatchSnapshot> => {
      const snapshot = await getEventDescriptionBatchStatus(batchId);
      setBatchSnapshot(snapshot);
      for (const item of snapshot.items) {
        if (item.status === 'running' || item.status === 'pending') {
          setRowStatus(
            item.eventId,
            item.status === 'running' ? 'generating' : 'idle',
          );
        }
        if (item.status === 'failed') {
          setRowStatus(item.eventId, 'failed');
          setRowError(item.eventId, item.error ?? t('generateError'));
        }
      }
      return snapshot;
    },
    [t],
  );

  const handleGenerateSelected = async (): Promise<void> => {
    if (selectedEventIds.length === 0) {
      return;
    }

    setBatchSnapshot(null);
    setActiveBatchId(null);
    fetchedBatchItemIds.current.clear();
    selectedEventIds.forEach((eventId) => {
      setRowStatus(eventId, 'idle');
      setRowError(eventId, null);
    });

    try {
      const result = await startEventDescriptionBatch({
        eventIds: selectedEventIds,
        model,
      });
      setActiveBatchId(result.batchId);
      await fetchBatchStatus(result.batchId);
      toast.success(t('batchStarted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('generateError'));
    }
  };

  useEffect(() => {
    if (!activeBatchId || !batchSnapshot || !isBatchRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchBatchStatus(activeBatchId).catch((error) => {
        console.error('Event description batch polling error:', error);
        toast.error(t('batchPollError'));
        setActiveBatchId(null);
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [activeBatchId, batchSnapshot, fetchBatchStatus, isBatchRunning, t]);

  useEffect(() => {
    if (!batchSnapshot) {
      return;
    }

    const completedItems = batchSnapshot.items.filter(
      (item) =>
        item.status === 'completed' &&
        !fetchedBatchItemIds.current.has(item.id),
    );

    if (completedItems.length === 0) {
      return;
    }

    completedItems.forEach((item) => fetchedBatchItemIds.current.add(item.id));

    void Promise.all(
      completedItems.map(async (item) => ({
        item,
        result: await getEventDescriptionItemResult(item.id),
      })),
    )
      .then((results) => {
        setDrafts((current) => ({
          ...current,
          ...Object.fromEntries(
            results.map(({ result }) => [result.eventId, result.description]),
          ),
        }));
        for (const { result } of results) {
          setRowStatus(result.eventId, 'ready');
          setRowError(result.eventId, null);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch event description results:', error);
        completedItems.forEach((item) => fetchedBatchItemIds.current.delete(item.id));
        toast.error(t('batchResultError'));
      });
  }, [batchSnapshot, t]);

  const subtitle = events.length === 1
    ? t('eventCountOne')
    : t('eventCount', { count: events.length });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title={t('title')}
        subtitle={subtitle}
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              {t('model')}
              <select
                value={model}
                onChange={(event) =>
                  setModel(event.target.value as OpenRouterScrapeModelId)
                }
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
              >
                {OPENROUTER_SCRAPE_MODEL_IDS.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </label>
            <Button
              onClick={handleGenerateSelected}
              disabled={selectedCount === 0 || isBatchRunning}
            >
              {isBatchRunning ? t('generatingSelected') : t('generateSelected', { count: selectedCount })}
            </Button>
          </div>
        }
      />

      {batchSnapshot && (
        <div className="text-sm text-gray-600">
          {t('statusSummary', {
            completed: batchSnapshot.summary.completed,
            failed: batchSnapshot.summary.failed,
          })}
        </div>
      )}

      {events.length === 0 ? (
        <ListEmptyState message={t('empty')} />
      ) : (
        <div className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  <th className="border-b border-gray-100 py-3 pl-4 pr-2">
                    <input
                      type="checkbox"
                      checked={allSelectableSelected}
                      onChange={toggleAll}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 font-medium">
                    {t('columns.name')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 font-medium">
                    {t('columns.website')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 text-right font-medium">
                    {t('columns.races')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 font-medium">
                    {t('columns.description')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 font-medium">
                    {t('columns.updatedAt')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 font-medium">
                    {t('columns.status')}
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 text-right font-medium">
                    {t('columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.map((eventDetail) => {
                  const event = eventDetail.event;
                  const status = statuses[event.id] ?? 'idle';
                  const currentDescription = currentDescriptions[event.id] ?? '';
                  const draftDescription = drafts[event.id] ?? '';
                  const updatedAt = updatedAtByEventId[event.id] ?? event.updatedAt;
                  const error = errors[event.id];

                  return (
                    <EventDescriptionRow
                      key={event.id}
                      eventDetail={eventDetail}
                      locale={locale}
                      isSelected={selectedIds.has(event.id)}
                      status={status}
                      currentDescription={currentDescription}
                      draftDescription={draftDescription}
                      updatedAt={updatedAt}
                      error={error}
                      labels={{
                        missingUrl: t('missingUrl'),
                        review: t('review'),
                        generating: t('generating'),
                        generate: t('generate'),
                        status: t(`rowStatus.${status}`),
                      }}
                      onToggleSelected={() => toggleSelected(event.id)}
                      onOpenReview={() => setDescriptionModalEventId(event.id)}
                      onGenerate={() => void handleGenerateOne(event.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {descriptionModalEventId && (() => {
        const modalEvent = events.find((e) => e.event.id === descriptionModalEventId);
        if (!modalEvent) return null;
        const current = currentDescriptions[descriptionModalEventId] ?? '';
        const draft = drafts[descriptionModalEventId] ?? '';
        return (
          <BaseModal
            isOpen
            onClose={() => setDescriptionModalEventId(null)}
            title={modalEvent.event.name}
            maxWidth="2xl"
          >
            <div className="flex flex-col gap-6">
              {draft && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{t('draft')}</p>
                  <p className="whitespace-pre-line text-xs leading-5 text-gray-900">{draft}</p>
                </div>
              )}
              {current && (
                <div className="flex flex-col gap-2">
                  <p className={`text-xs font-medium uppercase tracking-wide ${draft ? 'text-gray-400' : 'text-gray-500'}`}>{t('current')}</p>
                  <p className={`whitespace-pre-line text-xs leading-5 ${draft ? 'text-gray-400' : 'text-gray-700'}`}>{current}</p>
                </div>
              )}
              {!current && !draft && (
                <p className="text-sm text-gray-400">{t('descriptionPlaceholder')}</p>
              )}
              {draft && (
                <div className="flex justify-end">
                  <IconButton
                    onClick={() => {
                      void handleSave(descriptionModalEventId);
                      setDescriptionModalEventId(null);
                    }}
                    title={t('save')}
                  >
                    <Check className="h-4 w-4" strokeWidth={1.8} />
                  </IconButton>
                </div>
              )}
            </div>
          </BaseModal>
        );
      })()}
    </div>
  );
}
