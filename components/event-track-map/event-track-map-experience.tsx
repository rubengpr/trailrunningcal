'use client';

import { useMemo, useState } from 'react';
import { DeferredEventTrackMap } from '@/components/event-track-map/deferred-event-track-map';
import { ElevationProfileChart } from '@/components/event-track-map/elevation-profile';
import { buildElevationProfiles } from '@/lib/race-tracks/elevation-profile';
import type {
  ElevationProfileCursorPoint,
  TrackRoute,
} from '@/types/race-track.types';

interface EventTrackMapExperienceProps {
  chartDescription: string;
  errorMessage: string;
  errorTitle: string;
  eventId: string;
  eventSlug: string;
  routes: TrackRoute[];
}

export function EventTrackMapExperience({
  chartDescription,
  errorMessage,
  errorTitle,
  eventId,
  eventSlug,
  routes,
}: EventTrackMapExperienceProps) {
  const profiles = useMemo(() => buildElevationProfiles(routes), [routes]);
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
  };

  return (
    <>
      <DeferredEventTrackMap
        activePoint={activePoint}
        eventId={eventId}
        eventSlug={eventSlug}
        routes={routes}
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
}
