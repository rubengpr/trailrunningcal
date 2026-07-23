'use client';

import { useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Calendar,
  Check,
  Coins,
  Globe,
  MapPin,
  TextCursor,
  WholeWord,
  X,
} from 'lucide-react';
import { EventRacesEditModal } from '@/components/admin/event-races-edit-modal';
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
    tiers: race.tiers,
  };
}

function formatTierPrice(priceEur: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(priceEur);
}

function formatTierDeadline(endsAt: string, locale: Locale): string {
  const [year, month, day] = endsAt.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
}

function parseLocalDate(dateString: string): Date | null {
  const [year, month, day] = dateString.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRaceDate(
  dateString: string | null,
  locale: Locale,
  fallback: string,
): string {
  if (!dateString) {
    return fallback;
  }

  const date = parseLocalDate(dateString);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
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

interface ReviewActionButtonProps {
  title: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
  variant?: 'default' | 'primary';
}

function ReviewActionButton({
  title,
  onClick,
  disabled,
  children,
  variant = 'default',
}: ReviewActionButtonProps): React.ReactElement {
  const classes = variant === 'primary'
    ? 'text-gray-900 hover:bg-gray-100'
    : 'text-gray-700 hover:bg-gray-100';

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-35 ${classes}`}
    >
      {children}
    </button>
  );
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
}: EventImportPreviewProps): React.ReactElement {
  const t = useTranslations('admin.events.import.results');
  const pricingT = useTranslations('event.pricing');
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
  const isActionDisabled = isAccepting || isAccepted || isRejected;

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
        <section className="border-b border-gray-100 p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="text-xl font-semibold leading-tight text-gray-950">
                  {event.name}
                </h2>
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('websiteUrl')}
                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Globe className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
              <div className="pointer-events-none flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <ReviewActionButton
                  title={isAccepted ? t('reviewAccepted') : t('acceptEvent')}
                  disabled={isActionDisabled}
                  onClick={() => void onAccept()}
                  variant="primary"
                >
                  {isAccepting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                </ReviewActionButton>
                <ReviewActionButton
                  title={t('editReview')}
                  disabled={isActionDisabled}
                  onClick={handleStartEdit}
                >
                  <TextCursor className="h-3.5 w-3.5" aria-hidden="true" />
                </ReviewActionButton>
                {showReject && (
                  <ReviewActionButton
                    title={isRejected ? t('reviewRejected') : t('rejectEvent')}
                    disabled={isActionDisabled}
                    onClick={onReject}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </ReviewActionButton>
                )}
              </div>
            </div>
            <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="sr-only">{t('date')}</dt>
                <dd className="flex items-center gap-2 text-gray-900">
                  <Calendar className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <span>{eventDate}</span>
                </dd>
              </div>
              <div>
                <dt className="sr-only">{t('location')}</dt>
                <dd className="flex items-center gap-2 text-gray-900">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <span>{eventLocation}</span>
                </dd>
              </div>
            </dl>
          </div>
          {description && (
            <div className="mt-5 max-w-4xl">
              <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
                {description}
              </p>
              <span
                title={t('descriptionCharacterCount', {
                  count: description.length,
                })}
                className="mt-3 inline-flex items-center gap-1 rounded-full border border-gray-200/60 bg-gray-50 px-2 text-[11px] font-medium tabular-nums text-gray-600"
              >
                <WholeWord className="size-3" strokeWidth={2} aria-hidden="true" />
                {description.length}
              </span>
            </div>
          )}
        </section>

        <section className="p-5 sm:p-6">
          <div className="space-y-1">
            {races.map((race, index) => {
              const raceName = race.name?.trim() ?? '';
              const city = race.city.trim() || t('unknown');
              const province = race.province.trim() || t('unknown');
              const elevation = race.elevationGainM === null
                ? t('elevationUnknown')
                : String(Math.round(race.elevationGainM));
              const contextFields = [
                ...(showRaceDates
                  ? [formatRaceDate(race.date, locale, t('unknown'))]
                  : []),
                ...(showRaceLocations ? [city, province] : []),
              ];
              const metricFields = [
                String(Math.round(race.distanceKm)),
                elevation,
              ];

              return (
                <article
                  key={`${race.date ?? 'unknown'}-${race.distanceKm}-${index}`}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 rounded-md px-2 py-2.5 text-sm font-normal text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span className="tabular-nums text-gray-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      {raceName && <span>{raceName}</span>}
                      {contextFields.map((field, fieldIndex) => (
                        <span
                          key={`${field}-${fieldIndex}`}
                          className="inline-flex items-center gap-x-2"
                        >
                          {(raceName || fieldIndex > 0) && (
                            <span className="text-gray-300" aria-hidden="true">
                              ·
                            </span>
                          )}
                          <span>{field}</span>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-x-2 tabular-nums sm:justify-end">
                      {metricFields.map((field, fieldIndex) => (
                        <span
                          key={`${field}-${fieldIndex}`}
                          className="inline-flex items-center gap-x-2"
                        >
                          {fieldIndex > 0 && (
                            <span className="text-gray-300" aria-hidden="true">
                              ·
                            </span>
                          )}
                          <span>{field}</span>
                        </span>
                      ))}
                    </div>
                    {race.tiers.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 sm:col-span-2">
                        <Coins className="size-3.5 shrink-0 text-gray-400" />
                        {race.tiers.map((tier, tierIndex) => (
                          <span
                            className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 tabular-nums"
                            key={`${tier.endsAt ?? 'default'}-${tierIndex}`}
                          >
                            {tier.priceEur === 0
                              ? pricingT('free')
                              : formatTierPrice(tier.priceEur, locale)}
                            {tier.endsAt
                              ? ` ${pricingT('until', {
                                  date: formatTierDeadline(tier.endsAt, locale),
                                })}`
                              : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
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
    </div>
  );
}
