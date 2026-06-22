'use client';

import { lazy, Suspense } from 'react';
import type { RacesMapProps } from '@/components/races-map/races-map';

const LazyRacesMap = lazy(async () => {
  const racesMapModule = await import('@/components/races-map/races-map');
  return { default: racesMapModule.RacesMap };
});

function MapPlaceholder({ className }: Pick<RacesMapProps, 'className'>) {
  const rootClassName = className
    ? `w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-100 ${className}`
    : 'w-full h-[min(78vh,640px)] rounded-lg border border-gray-200 overflow-hidden bg-gray-100';

  return <div className={rootClassName} />;
}

export function DeferredRacesMap(props: RacesMapProps) {
  return (
    <Suspense fallback={<MapPlaceholder className={props.className} />}>
      <LazyRacesMap {...props} />
    </Suspense>
  );
}
