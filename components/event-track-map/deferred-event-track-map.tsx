'use client';

import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ErrorMessage } from '@/components/ui/error-message';
import type { EventTrackMapProps } from '@/components/event-track-map/event-track-map';
import {
  EVENT_TRACK_MAP_CLASS_NAME,
  EventTrackMapPlaceholder,
} from '@/components/event-track-map/event-track-map-placeholder';
import { useDeferredVisibility } from '@/hooks/use-deferred-visibility';

const MAP_VISIBILITY_THRESHOLD = 0.25;

let modulePromise: Promise<{
  default: typeof import('@/components/event-track-map/event-track-map').EventTrackMap;
}> | null = null;

function loadMap() {
  modulePromise ??= import('@/components/event-track-map/event-track-map').then(
    (module) => ({ default: module.EventTrackMap }),
  );
  return modulePromise;
}

export function preloadEventTrackMap(): void {
  const promise = loadMap();
  void promise.catch(() => {
    if (modulePromise === promise) modulePromise = null;
  });
}

const LazyEventTrackMap = lazy(loadMap);

export function DeferredEventTrackMap(
  { loadImmediately = false, ...props }: EventTrackMapProps & { loadImmediately?: boolean },
) {
  const { isVisible, targetRef } = useDeferredVisibility<HTMLDivElement>({
    preload: preloadEventTrackMap,
    threshold: MAP_VISIBILITY_THRESHOLD,
  });

  const shouldLoad = loadImmediately || isVisible;

  if (!shouldLoad) {
    return <EventTrackMapPlaceholder ref={targetRef} />;
  }

  const fallback = (
    <ErrorMessage
      title={props.errorTitle}
      message={props.errorMessage}
      showRetry={false}
      className={EVENT_TRACK_MAP_CLASS_NAME}
    />
  );

  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={<EventTrackMapPlaceholder />}>
        <LazyEventTrackMap {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
