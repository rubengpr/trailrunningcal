import { ArrowUpRight, Trophy } from 'lucide-react';
import { TrackedLink } from '@/components/ui/tracked-link';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { Locale } from '@/i18n';
import type { TrailEventRace } from '@/types/event.types';

interface EventResultsAccordionProps {
  eventId: string;
  eventSlug: string;
  locale: Locale;
  races: TrailEventRace[];
  title: string;
  viewLabel: string;
}

function formatDistance(distanceKm: number, locale: Locale): string {
  const formatter = new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    maximumFractionDigits: 1,
  });

  return `${formatter.format(distanceKm)} km`;
}

export function EventResultsAccordion({
  eventId,
  eventSlug,
  locale,
  races,
  title,
  viewLabel,
}: EventResultsAccordionProps) {
  const resultRaces = races.filter(
    (race): race is TrailEventRace & { resultsUrl: string } =>
      race.resultsUrl !== null,
  );

  if (resultRaces.length === 0) return null;

  return (
    <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-2.5 shadow-sm sm:mt-8 sm:p-3">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-gray-700">
            <Trophy className="size-4" />
          </span>
          <span className="min-w-0 truncate text-base font-semibold text-gray-700">
            {title}
          </span>
        </span>
        </div>

      <div className="flex flex-1 flex-wrap gap-1.5 lg:justify-end">
        {resultRaces.map((race) => {
          return (
            <TrackedLink
              key={race.id}
              href={race.resultsUrl}
              eventName={ANALYTICS_EVENTS.EVENT_RACE_RESULTS_CLICKED}
              eventProperties={{
                event_id: eventId,
                event_slug: eventSlug,
                race_id: race.id,
                distance_km: race.distanceKm,
              }}
              external
              className="group/result inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/70 px-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-700 hover:bg-gray-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            >
              <span>
                {formatDistance(race.distanceKm, locale)}
              </span>
              <span className="flex shrink-0 items-center justify-center">
                <span className="sr-only">{viewLabel}</span>
                <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden />
              </span>
            </TrackedLink>
          );
        })}
      </div>
      </div>
    </section>
  );
}
