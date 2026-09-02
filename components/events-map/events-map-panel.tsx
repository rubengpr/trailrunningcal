'use client';

import { useTranslations } from 'next-intl';
import { DeferredEventsMap } from '@/components/events-map/deferred-events-map';
import { SearchError } from '@/components/ui/error-message';
import type { Locale } from '@/i18n';
import type { EventMapLocationsStatus } from '@/hooks/use-event-map-locations';
import type { EventMapMarker, MapPageLabels } from '@/types/map.types';

interface EventsMapPanelProps {
  markers: EventMapMarker[];
  locale: Locale;
  labels: MapPageLabels;
  status: EventMapLocationsStatus;
  className: string;
  mapClassName: string;
  onActivate: () => void;
  onRetry: () => void;
}

export function EventsMapPanel({
  markers,
  locale,
  labels,
  status,
  className,
  mapClassName,
  onActivate,
  onRetry,
}: EventsMapPanelProps): React.ReactElement {
  const tMap = useTranslations('map');

  return (
    <div className={className}>
      {status === 'error' && markers.length === 0 ? (
        <SearchError onRetry={onRetry} />
      ) : status === 'ready' && markers.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
          {tMap('empty')}
        </p>
      ) : (
        <div className="relative w-full lg:sticky lg:top-6">
          {status === 'error' ? (
            <div className="mb-3">
              <SearchError onRetry={onRetry} />
            </div>
          ) : null}
          <DeferredEventsMap
            markers={markers}
            locale={locale}
            labels={labels}
            isReady={markers.length > 0}
            onVisible={onActivate}
            className={mapClassName}
          />
          {status === 'loading' && markers.length === 0 ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-600">
              {tMap('loading')}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
