import { Coins } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { Locale } from '@/i18n';
import type { TrailEventAgentRace } from '@/types/trail-event-agent.types';

interface EventImportPreviewRaceRowProps {
  race: TrailEventAgentRace;
  index: number;
  showDate: boolean;
  showLocation: boolean;
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

function formatRaceDate(dateString: string | null, locale: Locale, fallback: string): string {
  if (!dateString) return fallback;

  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return fallback;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function EventImportPreviewRaceRow({
  race,
  index,
  showDate,
  showLocation,
}: EventImportPreviewRaceRowProps): React.ReactElement {
  const t = useTranslations('admin.events.import.results');
  const pricingT = useTranslations('event.pricing');
  const locale = useLocale() as Locale;
  const raceName = race.name?.trim() ?? '';
  const city = race.city.trim() || t('unknown');
  const province = race.province.trim() || t('unknown');
  const elevation = race.elevationGainM === null ? t('elevationUnknown') : String(Math.round(race.elevationGainM));
  const contextFields = [
    ...(showDate ? [formatRaceDate(race.date, locale, t('unknown'))] : []),
    ...(showLocation ? [city, province] : []),
  ];
  const metricFields = [String(Math.round(race.distanceKm)), elevation];

  return (
    <article className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 rounded-md px-2 py-2.5 text-sm font-normal text-gray-700 transition-colors hover:bg-gray-50">
      <span className="tabular-nums text-gray-400">{String(index + 1).padStart(2, '0')}</span>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {raceName && <span>{raceName}</span>}
          {contextFields.map((field, fieldIndex) => (
            <span key={`${field}-${fieldIndex}`} className="inline-flex items-center gap-x-2">
              {(raceName || fieldIndex > 0) && <span className="text-gray-300" aria-hidden="true">·</span>}
              <span>{field}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-x-2 tabular-nums sm:justify-end">
          {metricFields.map((field, fieldIndex) => (
            <span key={`${field}-${fieldIndex}`} className="inline-flex items-center gap-x-2">
              {fieldIndex > 0 && <span className="text-gray-300" aria-hidden="true">·</span>}
              <span>{field}</span>
            </span>
          ))}
        </div>
        {race.tiers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 sm:col-span-2">
            <Coins className="size-3.5 shrink-0 text-gray-400" />
            {race.tiers.map((tier, tierIndex) => (
              <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 tabular-nums" key={`${tier.endsAt ?? 'default'}-${tierIndex}`}>
                {tier.priceEur === 0 ? pricingT('free') : formatTierPrice(tier.priceEur, locale)}
                {tier.endsAt ? ` ${pricingT('until', { date: formatTierDeadline(tier.endsAt, locale) })}` : ''}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
