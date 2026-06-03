import { TrendingUp } from 'lucide-react';
import type { Locale } from '@/i18n';
import type { TrailEventRace } from '@/types/event.types';

interface EventDistanceListProps {
  races: TrailEventRace[];
  locale: Locale;
}

function formatDistance(distanceKm: number, locale: Locale): string {
  const formatter = new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    maximumFractionDigits: 1,
  });

  return formatter.format(distanceKm);
}

function ElevationLabel({ elevationGainM }: { elevationGainM: number | null }) {
  if (elevationGainM === null) return <span>-</span>;
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span>{elevationGainM}</span>
      <span className="text-[8px] font-medium uppercase text-gray-500">M</span>
    </span>
  );
}

function getElevationRatio(distanceKm: number, elevationGainM: number | null): string {
  if (elevationGainM === null) {
    return '-';
  }

  return `${Math.round(elevationGainM / distanceKm)} m/km`;
}

export async function EventDistanceList({ races, locale }: EventDistanceListProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {races.map((race) => {
        const distanceLabel = formatDistance(race.distanceKm, locale);

        return (
          <article
            key={race.id}
            className="rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm transition-colors hover:border-gray-300 sm:px-4"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex min-w-[72px] items-baseline gap-0.5">
                <span className="text-base font-semibold leading-none text-gray-950 sm:text-lg">
                  {distanceLabel}
                </span>
                <span className="text-[8px] font-medium uppercase text-gray-500">
                  km
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="font-medium text-gray-800">
                  <ElevationLabel elevationGainM={race.elevationGainM} />
                </span>
                <span className="text-gray-400">·</span>
                <span>{getElevationRatio(race.distanceKm, race.elevationGainM)}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
