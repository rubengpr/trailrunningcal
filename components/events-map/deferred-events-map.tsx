'use client';

import { lazy, Suspense } from 'react';
import type { EventsMapProps } from '@/components/events-map/events-map';

const LazyEventsMap = lazy(async () => {
  const eventsMapModule = await import('@/components/events-map/events-map');
  return { default: eventsMapModule.EventsMap };
});

function MapPlaceholder({ className }: Pick<EventsMapProps, 'className'>) {
  const rootClassName = className
    ? `w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-100 ${className}`
    : 'w-full h-[min(78vh,640px)] rounded-lg border border-gray-200 overflow-hidden bg-gray-100';

  return <div className={rootClassName} />;
}

export function DeferredEventsMap(props: EventsMapProps) {
  return (
    <Suspense fallback={<MapPlaceholder className={props.className} />}>
      <LazyEventsMap {...props} />
    </Suspense>
  );
}
