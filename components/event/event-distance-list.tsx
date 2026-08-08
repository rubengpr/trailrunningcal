import { TrendingUp } from 'lucide-react';
import { RaceMapButton } from '@/components/event/race-map-button';
import { RacePriceBadge } from '@/components/event/race-price-badge';
import { ElevationIntensity } from '@/components/race/elevation-intensity';
import type { Locale } from '@/i18n';
import { getRaceMapEmbed } from '@/lib/races/map-url';
import type { TrailEventRace } from '@/types/event.types';

interface EventDistanceListProps {
  eventId: string;
  eventName: string;
  eventSlug: string;
  races: TrailEventRace[];
  locale: Locale;
  ratioTooltip: string;
}

function formatDistance(distanceKm: number, locale: Locale): string {
  const formatter = new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    maximumFractionDigits: 1,
  });

  return formatter.format(distanceKm);
}

function formatElevation(elevationGainM: number | null, locale: Locale): string {
  if (elevationGainM === null) return '—';

  return new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES').format(
    elevationGainM,
  );
}

export function EventDistanceList({
  eventId,
  eventName,
  eventSlug,
  races,
  locale,
  ratioTooltip,
}: EventDistanceListProps) {
  return (
    <div className="px-4 sm:px-6">
      {races.map((race) => {
        const raceName =
          race.name ??
          `${eventName} - ${formatDistance(race.distanceKm, locale)} km`;
        const map = getRaceMapEmbed(race.mapUrl);

        return (
          <article
            key={race.id}
            className="border-b border-gray-200 py-4 last:border-b-0 lg:border-b-0"
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="min-w-0 lg:flex-1">
                <h3 className="text-base font-medium leading-snug text-gray-950">
                  {raceName}
                </h3>
              </div>

              <div
                className="grid shrink-0 grid-cols-[3.75rem_6rem_4.5rem] items-center gap-x-2 text-sm sm:grid-cols-[4.5rem_6rem_5.5rem] sm:gap-x-6"
                data-testid="race-metrics"
              >
                <span className="inline-flex items-baseline justify-self-start gap-1 font-semibold text-gray-950 lg:justify-self-end">
                  <span className="text-base leading-none">
                    {formatDistance(race.distanceKm, locale)}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.14em] text-gray-500">
                    km
                  </span>
                </span>
                <span className="inline-flex items-center justify-self-start gap-2 font-semibold text-gray-900 lg:justify-self-end">
                  <TrendingUp className="h-4 w-4 text-lime-600" />
                  {formatElevation(race.elevationGainM, locale)} m
                </span>
                <ElevationIntensity
                  distanceKm={race.distanceKm}
                  elevationGainM={race.elevationGainM}
                  tooltip={ratioTooltip}
                />
              </div>
            </div>
            {(race.tiers.length > 0 || map) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <RacePriceBadge
                  locale={locale}
                  raceId={race.id}
                  tiers={race.tiers}
                />
                {map && (
                  <RaceMapButton
                    eventId={eventId}
                    eventSlug={eventSlug}
                    mapUrl={map.url}
                    provider={map.provider}
                    raceId={race.id}
                    raceName={raceName}
                  />
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
