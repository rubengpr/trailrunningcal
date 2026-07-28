'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { EventsMapProps } from '@/components/events-map/events-map';

const MAP_VISIBILITY_THRESHOLD = 0.25;

const LazyEventsMap = lazy(async () => {
  const eventsMapModule = await import('@/components/events-map/events-map');
  return { default: eventsMapModule.EventsMap };
});

function getPlaceholderClassName(className: EventsMapProps['className']): string {
  return className
    ? `w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-100 ${className}`
    : 'w-full h-[min(78vh,640px)] rounded-lg border border-gray-200 overflow-hidden bg-gray-100';
}

function MapPlaceholder({ className }: Pick<EventsMapProps, 'className'>) {
  return <div className={getPlaceholderClassName(className)} />;
}

export function DeferredEventsMap(props: EventsMapProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const placeholder = placeholderRef.current;
    if (!placeholder) return;

    if (typeof IntersectionObserver === 'undefined') {
      const timeoutId = setTimeout(() => setShouldLoad(true), 0);
      return () => clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry?.isIntersecting &&
          entry.intersectionRatio >= MAP_VISIBILITY_THRESHOLD
        ) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold: MAP_VISIBILITY_THRESHOLD },
    );
    observer.observe(placeholder);
    return () => observer.disconnect();
  }, []);

  if (!shouldLoad) {
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
