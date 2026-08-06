'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { EventsMapProps } from '@/components/events-map/events-map';

const MAP_VISIBILITY_THRESHOLD = 0.25;

let eventsMapModulePromise: Promise<{
  default: typeof import('@/components/events-map/events-map').EventsMap;
}> | null = null;

function loadEventsMap() {
  eventsMapModulePromise ??= import('@/components/events-map/events-map')
    .then((eventsMapModule) => ({ default: eventsMapModule.EventsMap }));
  return eventsMapModulePromise;
}

function preloadEventsMap() {
  const promise = loadEventsMap();

  void promise.catch(() => {
    if (eventsMapModulePromise === promise) {
      eventsMapModulePromise = null;
    }
  });
}

const LazyEventsMap = lazy(loadEventsMap);

function getPlaceholderClassName(className: EventsMapProps['className']): string {
  return className
    ? `w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-100 ${className}`
    : 'w-full h-[min(78vh,640px)] rounded-lg border border-gray-200 overflow-hidden bg-gray-100';
}

function MapPlaceholder({ className }: Pick<EventsMapProps, 'className'>) {
  return <div className={getPlaceholderClassName(className)} />;
}

interface DeferredEventsMapProps extends EventsMapProps {
  isReady?: boolean;
  onVisible?: () => void;
}

export function DeferredEventsMap({
  isReady = true,
  onVisible,
  ...props
}: DeferredEventsMapProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const placeholder = placeholderRef.current;
    if (!placeholder) return;

    if (typeof IntersectionObserver === 'undefined') {
      const timeoutId = setTimeout(() => {
        preloadEventsMap();
        setShouldLoad(true);
        onVisible?.();
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry?.isIntersecting &&
          entry.intersectionRatio >= MAP_VISIBILITY_THRESHOLD
        ) {
          preloadEventsMap();
          setShouldLoad(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      { threshold: MAP_VISIBILITY_THRESHOLD },
    );
    observer.observe(placeholder);
    return () => observer.disconnect();
  }, [onVisible]);

  if (!shouldLoad || !isReady) {
    return (
      <div
        ref={placeholderRef}
        data-map-placeholder
        className={getPlaceholderClassName(props.className)}
      />
    );
  }

  return (
    <Suspense fallback={<MapPlaceholder className={props.className} />}>
      <LazyEventsMap {...props} />
    </Suspense>
  );
}
