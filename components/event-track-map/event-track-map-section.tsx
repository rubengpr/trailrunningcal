import { Map } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { DeferredEventTrackMap } from '@/components/event-track-map/deferred-event-track-map';
import { ElevationProfileChart } from '@/components/event-track-map/elevation-profile';
import { buildElevationProfiles } from '@/lib/race-tracks/elevation-profile';
import { buildTrackRoutes } from '@/lib/race-tracks/routes';
import type { TrailEventRaceWithTrack } from '@/types/event.types';

interface EventTrackMapSectionProps {
  eventId: string;
  eventName: string;
  eventSlug: string;
  races: TrailEventRaceWithTrack[];
}

export async function EventTrackMapSection({
  eventId,
  eventName,
  eventSlug,
  races,
}: EventTrackMapSectionProps) {
  const t = await getTranslations('event.trackMap');
  const routes = buildTrackRoutes(
    races.flatMap((race) =>
      race.trackGeometry
        ? [
            {
              raceId: race.id,
              raceName:
                race.name ??
                t('unnamedRoute', {
                  eventName,
                  distance: race.distanceKm,
                }),
              distanceKm: race.distanceKm,
              geometry: race.trackGeometry,
            },
          ]
        : [],
    ),
  );

  if (routes.length === 0) return null;
  const elevationProfiles = buildElevationProfiles(routes);

  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex items-center gap-2">
        <Map className="h-5 w-5 text-gray-500" />
        <h2 className="text-xl font-semibold text-gray-950 sm:text-2xl">
          {t('title')}
        </h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_14px_40px_-28px_rgba(28,25,23,0.5)]">
        <DeferredEventTrackMap
          eventId={eventId}
          eventSlug={eventSlug}
          routes={routes}
          errorTitle={t('errorTitle')}
          errorMessage={t('errorMessage')}
        />
        <ElevationProfileChart
          profiles={elevationProfiles}
          chartDescription={t('elevationProfile.chartDescription')}
        />
      </div>
    </section>
  );
}
