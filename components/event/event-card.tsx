'use client';

import Link from 'next/link';
import type { Locale } from '@/i18n';
import type { PublicEventDetail } from '@/types/event.types';
import { formatEventLocationLabel } from '@/lib/events/utils';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { useCardImpression } from '@/hooks/use-card-impression';
import { DistanceBadge } from '@/components/race/distance-badge';

interface EventCardProps {
  eventDetail: PublicEventDetail;
  locale: Locale;
  analyticsContext?: {
    source: 'calendar_explorer';
    pageType: 'homepage' | 'finder_type' | 'finder_province_distance';
    listPosition: number;
    layoutToggleVariant?: 'control' | 'icon_text';
  };
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

export function EventCard({ eventDetail, locale, analyticsContext }: EventCardProps) {
  const { day, month, weekday } = formatDateBlock(eventDetail.dateRange.startDate, locale);
  const location = formatEventLocationLabel(eventDetail.location, locale);
  const impressionRef = useCardImpression<HTMLElement>({
    pageType: analyticsContext?.pageType,
    eventId: eventDetail.event.id,
    eventSlug: eventDetail.event.slug,
    listPosition: analyticsContext?.listPosition,
  });
  const handleClick = analyticsContext
    ? () => {
      track(ANALYTICS_EVENTS.RACE_CARD_CLICKED, {
        event_id: eventDetail.event.id,
        event_slug: eventDetail.event.slug,
        source: analyticsContext.source,
        list_position: analyticsContext.listPosition,
        ...(analyticsContext.layoutToggleVariant
          ? { layout_toggle_variant: analyticsContext.layoutToggleVariant }
          : {}),
      });
    }
    : undefined;

  return (
    <article
      ref={impressionRef}
      className="relative w-full min-w-0 max-w-full rounded-lg bg-white shadow transition-shadow sm:hover:shadow-md"
    >
      <Link
        href={`/${locale}/e/${eventDetail.event.slug}`}
        prefetch={false}
        onClick={handleClick}
        className="block px-2 py-2.5 sm:px-4 sm:py-4"
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex min-w-12.5 flex-col items-center justify-center rounded-sm bg-amber-50 px-3 py-2 text-gray-800">
            <span className="text-[9px] font-medium uppercase tracking-wide sm:text-[10px]">
              {weekday}
            </span>
            <span className="text-base font-bold sm:text-lg">{day}</span>
            <span className="text-xs font-medium capitalize">{month}</span>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h3 className="truncate text-sm font-bold text-gray-900 sm:text-lg">
              {eventDetail.event.name}
            </h3>
            <div className="mt-1 flex min-w-0 gap-3 overflow-hidden text-xs text-gray-600 sm:text-sm">
              {location && (
                <span className="min-w-0 flex-1 truncate">
                  {location}
                </span>
              )}
            </div>
            {eventDetail.races.length > 0 && (
              <div className="mt-1.5 flex min-w-0 flex-nowrap gap-1.5 overflow-hidden">
                {eventDetail.races.map((race) => (
                  <DistanceBadge
                    key={race.id}
                    distanceKm={race.distanceKm}
                    locale={locale}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
