import Link from 'next/link';
import type { Locale } from '@/i18n';
import type { TrailEventDetail } from '@/types/event.types';

interface EventCardProps {
  eventDetail: TrailEventDetail;
  locale: Locale;
}

function formatDistance(distanceKm: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    maximumFractionDigits: 1,
  }).format(distanceKm);
}

function formatDateBlock(dateString: string | null, locale: Locale) {
  if (!dateString) {
    return {
      day: '-',
      month: '-',
      weekday: '-',
    };
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dateLocale = locale === 'ca' ? 'ca-ES' : 'es-ES';

  return {
    day: new Intl.DateTimeFormat(dateLocale, { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat(dateLocale, { month: 'short' })
      .format(date)
      .replace('.', ''),
    weekday: new Intl.DateTimeFormat(dateLocale, { weekday: 'short' })
      .format(date)
      .replace('.', ''),
  };
}

function buildDistanceSummary(eventDetail: TrailEventDetail, locale: Locale): string {
  return eventDetail.races
    .map((race) => `${formatDistance(race.distanceKm, locale)}K`)
    .join(' · ');
}

export function EventCard({ eventDetail, locale }: EventCardProps) {
  const { day, month, weekday } = formatDateBlock(eventDetail.dateRange.startDate, locale);
  const location = eventDetail.location.isMultipleLocations
    ? null
    : [eventDetail.location.city, eventDetail.location.province].filter(Boolean).join(', ');
  const distanceSummary = buildDistanceSummary(eventDetail, locale);

  return (
    <article className="relative w-full min-w-0 max-w-full rounded-lg bg-white shadow transition-shadow sm:hover:shadow-md">
      <Link
        href={`/${locale}/e/${eventDetail.event.slug}`}
        prefetch={false}
        className="block px-2 py-2.5 sm:px-4 sm:py-4"
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex min-w-[50px] flex-col items-center justify-center rounded-sm bg-amber-50 px-3 py-2 text-gray-800">
            <span className="text-[9px] font-medium uppercase tracking-wide sm:text-[10px]">
              {weekday}
            </span>
            <span className="text-base font-bold sm:text-lg">{day}</span>
            <span className="text-xs font-medium capitalize">{month}</span>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h3 className="truncate text-xs font-bold text-gray-900 sm:text-lg">
              {eventDetail.event.name}
            </h3>
            <div className="mt-1 flex min-w-0 gap-3 overflow-hidden text-xs text-gray-600 sm:text-sm">
              {location && (
                <span className="min-w-0 flex-1 truncate">
                  {location}
                </span>
              )}
            </div>
            {distanceSummary && (
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 max-w-full rounded-sm bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                  {distanceSummary}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
