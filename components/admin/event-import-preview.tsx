'use client';

import { useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EventRacesEditModal } from '@/components/admin/event-races-edit-modal';
import { EventImportPreviewHeader } from '@/components/admin/event-import-preview-header';
import { EventImportPreviewRaceRow } from '@/components/admin/event-import-preview-race-row';
import type { Locale } from '@/i18n';
import {
  buildEventDateRange,
  buildEventLocation,
  formatEventDateRange,
} from '@/lib/events/utils';
import type { TrailEventRace } from '@/types/event.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface EventImportPreviewProps {
  event: TrailEventAgentEvent | null;
  races: TrailEventAgentRace[];
  isLoading: boolean;
  error: string | null;
  emptyMessage?: string | null;
  emptyAction?: ReactNode;
  onAccept: () => Promise<void>;
  isAccepted: boolean;
  isAccepting: boolean;
  onReject: () => void;
  isRejected: boolean;
  showReject?: boolean;
  onSaveReview: (
    event: TrailEventAgentEvent,
    races: TrailEventAgentRace[],
  ) => Promise<void> | void;
  onSaveDraft?: (
    event: TrailEventAgentEvent,
    races: TrailEventAgentRace[],
  ) => Promise<void>;
  isSavingDraft?: boolean;
  isDraftSaved?: boolean;
  readOnly?: boolean;
}

function toPreviewRace(
  race: TrailEventAgentRace,
  index: number,
): TrailEventRace {
  return {
    id: `preview-${index}`,
    name: race.name ?? '',
    date: race.date,
    distanceKm: race.distanceKm,
    elevationGainM: race.elevationGainM,
    city: race.city,
    province: race.province,
    resultsUrl: null,
    tiers: race.tiers,
  };
}

function formatEventLocation(
  races: TrailEventRace[],
  t: ReturnType<typeof useTranslations>,
): string {
  const location = buildEventLocation(races);

  if (location.isMultipleLocations) {
    return t('multipleLocations');
  }

  const parts = [location.city, location.province].filter(
    (part): part is string => part !== null && part.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(', ') : t('unknown');
}

export function EventImportPreview({
  event,
  races,
  isLoading,
  error,
  emptyMessage,
  emptyAction,
  onAccept,
  isAccepted,
  isAccepting,
  onReject,
  isRejected,
  showReject = true,
  onSaveReview,
  onSaveDraft,
  isSavingDraft = false,
  isDraftSaved = false,
  readOnly = false,
}: EventImportPreviewProps): React.ReactElement {
  const t = useTranslations('admin.events.import.results');
  const locale = useLocale() as Locale;
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <div className="pipeline-loading-dot mb-3 inline-block h-4 w-4 rounded-full bg-gray-300" />
        <p className="text-sm text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-800">{t('errorTitle')}</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!event || races.length === 0) {
    return (
      <div className="flex items-center gap-4 overflow-hidden rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
          <p className="shrink-0 text-sm font-medium text-red-800">
            {t('noResultsTitle')}
          </p>
          {emptyMessage && (
            <p className="min-w-0 truncate text-sm text-red-600">
              {emptyMessage}
            </p>
          )}
        </div>
        {emptyAction && <div className="shrink-0">{emptyAction}</div>}
      </div>
    );
  }

  const previewRaces = races.map(toPreviewRace);
  const dateRange = buildEventDateRange(previewRaces);
  const eventDate = formatEventDateRange(dateRange, locale, t('unknown'));
  const eventLocation = formatEventLocation(previewRaces, t);
  const showRaceDates = new Set(races.map((race) => race.date ?? '')).size > 1;
  const showRaceLocations = buildEventLocation(previewRaces).isMultipleLocations;
  const description = event.description?.trim();
  const websiteUrl = event.websiteUrl?.trim();
  const isActionDisabled = isAccepting || isAccepted || isRejected || isDraftSaved;

  const handleStartEdit = (): void => {
    setIsEditing(true);
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
  };

  const handleSaveReview = async (
    nextEvent: TrailEventAgentEvent,
    nextRaces: TrailEventAgentRace[],
  ): Promise<void> => {
    if (isSavingReview) return;

    setIsSavingReview(true);
    try {
      await onSaveReview(nextEvent, nextRaces);
      setIsEditing(false);
    } catch {
      // The parent owns user feedback. Keep the edit form open with its values.
    } finally {
      setIsSavingReview(false);
    }
  };

  return (
    <div
      className="group rounded-lg bg-linear-to-br from-gray-200 via-gray-50 to-gray-200 p-px shadow-sm focus:outline-none"
      tabIndex={0}
    >
      <div className="overflow-hidden rounded-[7px] bg-linear-to-br from-white via-gray-50 to-gray-100">
        <EventImportPreviewHeader
          event={event}
          races={races}
          eventDate={eventDate}
          eventLocation={eventLocation}
          description={description}
          websiteUrl={websiteUrl}
          readOnly={readOnly}
          isActionDisabled={isActionDisabled}
          isAccepted={isAccepted}
          isAccepting={isAccepting}
          isRejected={isRejected}
          showReject={showReject}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={handleStartEdit}
          onSaveDraft={onSaveDraft}
          isSavingDraft={isSavingDraft}
          isDraftSaved={isDraftSaved}
        />

        <section className="p-5 sm:p-6">
          <div className="space-y-1">
            {races.map((race, index) => (
              <EventImportPreviewRaceRow
                key={`${race.date ?? 'unknown'}-${race.distanceKm}-${index}`}
                race={race}
                index={index}
                showDate={showRaceDates}
                showLocation={showRaceLocations}
              />
            ))}
          </div>
        </section>
      </div>
      {!readOnly && (
        <EventRacesEditModal
          isOpen={isEditing}
          event={event}
          races={races}
          title={t('editReview')}
          isSaving={isSavingReview}
          savingLabel={t('savingReview')}
          showTiers
          onClose={handleCancelEdit}
          onSave={handleSaveReview}
        />
      )}
    </div>
  );
}
