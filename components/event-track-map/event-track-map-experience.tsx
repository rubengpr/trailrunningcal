'use client';

import { useCallback, useMemo, useState } from 'react';
import { Map } from 'lucide-react';
import {
  DeferredEventTrackMap,
  EVENT_TRACK_MAP_CLASS_NAME,
  EventTrackMapPlaceholder,
  preloadEventTrackMap,
} from '@/components/event-track-map/deferred-event-track-map';
import { ElevationProfileChart } from '@/components/event-track-map/elevation-profile';
import { ErrorMessage } from '@/components/ui/error-message';
import { fetchEventTrackRoutes } from '@/lib/api/event-tracks';
import { buildElevationProfiles } from '@/lib/race-tracks/elevation-profile';
import { useDeferredVisibility } from '@/hooks/use-deferred-visibility';
import type {
  ElevationProfileCursorPoint,
  TrackRoute,
} from '@/types/race-track.types';
import type { Locale } from '@/i18n';

interface EventTrackMapExperienceProps {
  chartDescription: string;
  errorMessage: string;
  errorTitle: string;
  eventId: string;
  eventSlug: string;
  locale: Locale;
  title: string;
}

export function EventTrackMapExperience({
  chartDescription,
  errorMessage,
  errorTitle,
  eventId,
  eventSlug,
  locale,
  title,
}: EventTrackMapExperienceProps) {
  const [routes, setRoutes] = useState<TrackRoute[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadRoutes = useCallback(() => {
    preloadEventTrackMap();
    void fetchEventTrackRoutes(eventId, locale)
      .then(setRoutes)
      .catch(() => setLoadFailed(true));
  }, [eventId, locale]);
  const { isVisible, targetRef } = useDeferredVisibility<HTMLDivElement>({
    preload: loadRoutes,
    threshold: 0.25,
  });
  const profiles = useMemo(
    () => buildElevationProfiles(routes ?? []),
    [routes],
  );
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? '');
  const [activePoint, setActivePoint] =
    useState<ElevationProfileCursorPoint | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartProps = {
    activePoint,
    chartDescription,
    onActivePointChange: setActivePoint,
    onSelectedIdChange: setSelectedId,
    profiles,
    selectedId,
    locale,
  };

  if (routes?.length === 0) return null;

  const content = loadFailed ? (
    <ErrorMessage
      title={errorTitle}
      message={errorMessage}
      showRetry={false}
      className={EVENT_TRACK_MAP_CLASS_NAME}
    />
  ) : !isVisible || routes === null ? (
    <div ref={targetRef}>
      <EventTrackMapPlaceholder />
    </div>
  ) : (
    <>
      <DeferredEventTrackMap
        activePoint={activePoint}
        eventId={eventId}
        eventSlug={eventSlug}
        routes={routes}
        loadImmediately
        errorTitle={errorTitle}
        errorMessage={errorMessage}
        fullscreenProfile={
          profiles.length > 0 ? (
            <ElevationProfileChart {...chartProps} variant="fullscreen" />
          ) : null
        }
        onFullscreenChange={setIsFullscreen}
      />
      {!isFullscreen ? <ElevationProfileChart {...chartProps} /> : null}
    </>
  );

  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex items-center gap-2">
        <Map className="h-5 w-5 text-gray-500" />
        <h2 className="text-xl font-semibold text-gray-950 sm:text-2xl">{title}</h2>
      </div>
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_14px_40px_-28px_rgba(28,25,23,0.5)]">
        {content}
      </div>
    </section>
  );
}
