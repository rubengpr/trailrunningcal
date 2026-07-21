'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { BaseModal } from '@/components/ui/base-modal';
import { NumberInput } from '@/components/ui/number-input';
import {
  RaceTierFields,
  toRaceTierDrafts,
  toRaceTierWriteInputs,
  validateRaceTierDrafts,
} from '@/components/event/race-tier-fields';
import type { RaceTierDraft } from '@/components/event/race-tier-fields';
import type { EventRaceWriteInput } from '@/lib/api/events';
import type { TrailEventAgentEvent } from '@/types/trail-event-agent.types';

interface EventRacesEditModalProps {
  isOpen: boolean;
  event: TrailEventAgentEvent | null;
  races: EventRaceWriteInput[];
  title: string;
  isSaving?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  showTiers?: boolean;
  onClose: () => void;
  onSave: (
    event: TrailEventAgentEvent,
    races: EventRaceWriteInput[],
  ) => Promise<void> | void;
}

type EventRacesEditModalContentProps = Omit<
  EventRacesEditModalProps,
  'event' | 'isOpen'
> & {
  event: TrailEventAgentEvent;
};

type ModalRaceDraft = Omit<EventRaceWriteInput, 'distanceKm' | 'tiers'> & {
  distanceKm: string;
  tierDrafts: RaceTierDraft[];
};

const inputClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400';
const labelClass = 'text-xs font-medium text-gray-600';

function emptyRaceDraft(): ModalRaceDraft {
  return {
    name: null,
    date: null,
    city: '',
    province: '',
    distanceKm: '',
    elevationGainM: null,
    tierDrafts: [],
  };
}

function RacePositionBadge({ number }: { number: number }): React.ReactElement {
  return (
    <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold tabular-nums text-gray-600">
      {number}
    </span>
  );
}

interface ReviewActionButtonProps {
  title: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

function ReviewActionButton({
  title,
  onClick,
  disabled,
  children,
}: ReviewActionButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function EventRacesEditModal({
  isOpen,
  event,
  races,
  title,
  isSaving = false,
  saveLabel,
  savingLabel,
  showTiers = false,
  onClose,
  onSave,
}: EventRacesEditModalProps): React.ReactElement {
  if (!isOpen || !event) {
    return <></>;
  }

  return (
    <EventRacesEditModalContent
      event={event}
      races={races}
      title={title}
      isSaving={isSaving}
      saveLabel={saveLabel}
      savingLabel={savingLabel}
      showTiers={showTiers}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EventRacesEditModalContent({
  event,
  races,
  title,
  isSaving = false,
  saveLabel,
  savingLabel,
  showTiers = false,
  onClose,
  onSave,
}: EventRacesEditModalContentProps): React.ReactElement {
  const t = useTranslations('admin.events.import.results');
  const [eventDraft, setEventDraft] = useState<TrailEventAgentEvent>(
    () => ({ ...event }),
  );
  const formT = useTranslations('adminEvents.form');
  const [raceDrafts, setRaceDrafts] = useState<ModalRaceDraft[]>(
    () => races.map((race) => ({
      ...race,
      distanceKm: String(race.distanceKm),
      tierDrafts: toRaceTierDrafts(
        race.tiers?.map((tier, index) => ({
          id: `tier-${index}`,
          ...tier,
        })) ?? [],
      ),
    })),
  );
  const [error, setError] = useState('');

  const updateRaceDraft = (
    index: number,
    race: ModalRaceDraft,
  ): void => {
    setRaceDrafts((drafts) =>
      drafts.map((draft, draftIndex) => (
        draftIndex === index ? race : draft
      )),
    );
  };

  const addRaceDraft = (): void => {
    const race = emptyRaceDraft();
    setRaceDrafts((drafts) => [...drafts, race]);
  };

  const removeRaceDraft = (index: number): void => {
    setRaceDrafts((drafts) => (
      drafts.length <= 1
        ? drafts
        : drafts.filter((_, draftIndex) => draftIndex !== index)
    ));
  };

  const handleSave = (): void => {
    if (isSaving) return;

    for (const race of raceDrafts) {
      const distanceKm = Number(race.distanceKm);
      if (
        !Number.isFinite(distanceKm) ||
        distanceKm <= 0 ||
        distanceKm >= 1000
      ) {
        setError(formT('errors.distance'));
        return;
      }
    }

    if (showTiers) {
      for (const race of raceDrafts) {
        const tierError = validateRaceTierDrafts(race.tierDrafts);
        if (tierError) {
          setError(formT(`errors.${tierError}`));
          return;
        }
      }
    }

    setError('');
    const racesToSave: EventRaceWriteInput[] = raceDrafts.map(
      ({ tierDrafts, ...race }) => ({
        ...race,
        distanceKm: Number(race.distanceKm),
        tiers: toRaceTierWriteInputs(tierDrafts),
      }),
    );

    void onSave(eventDraft, racesToSave);
  };

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={title}
      maxWidth="3xl"
    >
      <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-1 pb-1">
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{t('editFieldName')}</label>
            <input
              type="text"
              className={inputClass}
              value={eventDraft.name}
              disabled={isSaving}
              onChange={(e) =>
                setEventDraft({ ...eventDraft, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>
              {t('editFieldWebsiteUrl')}
            </label>
            <input
              type="url"
              className={inputClass}
              value={eventDraft.websiteUrl ?? ''}
              disabled={isSaving}
              onChange={(e) =>
                setEventDraft({
                  ...eventDraft,
                  websiteUrl: e.target.value.trim() || null,
                })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>
              {t('editFieldDescription')}
            </label>
            <textarea
              rows={12}
              className={`${inputClass} min-h-64 resize-y`}
              value={eventDraft.description ?? ''}
              disabled={isSaving}
              onChange={(e) =>
                setEventDraft({
                  ...eventDraft,
                  description: e.target.value || null,
                })
              }
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold leading-tight text-gray-950">
              {t('editRaceInfo')}
            </h3>
            <ReviewActionButton
              title={t('addRace')}
              onClick={addRaceDraft}
              disabled={isSaving}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </ReviewActionButton>
          </div>
          <div className="divide-y divide-gray-200">
            {raceDrafts.map((race, index) => (
              <div
                key={race.id ?? `race-draft-${index}`}
                className="py-8 first:pt-0 last:pb-0"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <RacePositionBadge number={index + 1} />
                    <p className="min-w-0 truncate text-sm font-semibold text-gray-900">
                      {race.name?.trim() || t('raceTitle', { number: index + 1 })}
                    </p>
                  </div>
                  <ReviewActionButton
                    title={t('removeRace')}
                    disabled={isSaving || raceDrafts.length <= 1}
                    onClick={() => removeRaceDraft(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </ReviewActionButton>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>
                    {t('editFieldName')}
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={race.name ?? ''}
                    disabled={isSaving}
                    onChange={(e) =>
                      updateRaceDraft(index, {
                        ...race,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      {t('editFieldDate')}
                    </label>
                    <input
                      type="date"
                      className={inputClass}
                      value={race.date ?? ''}
                      disabled={isSaving}
                      onChange={(e) =>
                        updateRaceDraft(index, {
                          ...race,
                          date: e.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      {t('editFieldDistance')}
                    </label>
                    <NumberInput
                      min="0"
                      step="0.1"
                      className={inputClass}
                      value={race.distanceKm}
                      disabled={isSaving}
                      onChange={(e) =>
                        updateRaceDraft(index, {
                          ...race,
                          distanceKm: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      {t('editFieldElevation')}
                    </label>
                    <NumberInput
                      min="0"
                      className={inputClass}
                      value={race.elevationGainM ?? ''}
                      disabled={isSaving}
                      onChange={(e) =>
                        updateRaceDraft(index, {
                          ...race,
                          elevationGainM: e.target.value === ''
                            ? null
                            : Number.parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      {t('editFieldCity')}
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      value={race.city}
                      disabled={isSaving}
                      onChange={(e) =>
                        updateRaceDraft(index, {
                          ...race,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>
                      {t('editFieldProvince')}
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      value={race.province}
                      disabled={isSaving}
                      onChange={(e) =>
                        updateRaceDraft(index, {
                          ...race,
                          province: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                {showTiers ? (
                  <div className="mt-4">
                    <RaceTierFields
                      idPrefix={`modal-race-${index}`}
                      tiers={race.tierDrafts}
                      disabled={isSaving}
                      onChange={(tierDrafts) =>
                        updateRaceDraft(index, { ...race, tierDrafts })
                      }
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
          >
            {t('cancelEdit')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSaving ? savingLabel ?? t('saveReview') : saveLabel ?? t('saveReview')}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
