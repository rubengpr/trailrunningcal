'use client';

import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ErrorMessage } from '@/components/ui/error-message';
import type { EventTrackMapProps } from '@/components/event-track-map/event-track-map';
import { useDeferredVisibility } from '@/hooks/use-deferred-visibility';

const MAP_VISIBILITY_THRESHOLD = 0.25;
const MAP_CLASS_NAME = 'h-[420px] w-full bg-stone-100 sm:h-[480px]';

let modulePromise: Promise<{
  default: typeof import('@/components/event-track-map/event-track-map').EventTrackMap;
}> | null = null;

function loadMap() {
  modulePromise ??= import('@/components/event-track-map/event-track-map').then(
    (module) => ({ default: module.EventTrackMap }),
  );
  return modulePromise;
}

function preloadMap(): void {
  const promise = loadMap();
  void promise.catch(() => {
    if (modulePromise === promise) modulePromise = null;
  });
}

const LazyEventTrackMap = lazy(loadMap);

function Placeholder({ testId }: { testId?: string }) {
  return (
    <div
      className={MAP_CLASS_NAME}
      data-event-track-map-placeholder
      data-testid={testId}
    />
  );
}

export function DeferredEventTrackMap(props: EventTrackMapProps) {
  const { isVisible, targetRef } = useDeferredVisibility<HTMLDivElement>({
    preload: preloadMap,
    threshold: MAP_VISIBILITY_THRESHOLD,
  });

  if (!isVisible) {
    return (
      <div
        ref={targetRef}
        className={MAP_CLASS_NAME}
        data-event-track-map-placeholder
      />
    );
  }

  const fallback = (
    <ErrorMessage
      title={props.errorTitle}
      message={props.errorMessage}
      showRetry={false}
      className={MAP_CLASS_NAME}
    />
  );

  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={<Placeholder />}>
        <LazyEventTrackMap {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
