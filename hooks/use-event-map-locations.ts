'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPublicEventLocations } from '@/lib/api/event-locations';
import {
  buildEventMapMarkers,
  eventMapLocationKey,
  getEventMapLocationKeys,
  PUBLIC_EVENT_LOCATION_BATCH_SIZE,
} from '@/lib/events/map';
import type { PublicEventDetail } from '@/types/event.types';
import type { EventMapLocation } from '@/types/map.types';

export type EventMapLocationsStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error';

interface EventMapLocationCache {
  locations: Map<string, EventMapLocation>;
  unavailable: Set<string>;
}

function chunkLocations<T>(locations: T[]): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < locations.length; index += PUBLIC_EVENT_LOCATION_BATCH_SIZE) {
    chunks.push(locations.slice(index, index + PUBLIC_EVENT_LOCATION_BATCH_SIZE));
  }
  return chunks;
}

export function useEventMapLocations(events: PublicEventDetail[]) {
  const [isActive, setIsActive] = useState(false);
  const [failedRequest, setFailedRequest] = useState<string | null>(null);
  const [cache, setCache] = useState<EventMapLocationCache>(() => ({
    locations: new Map(),
    unavailable: new Set(),
  }));

  const requestedLocations = useMemo(
    () => getEventMapLocationKeys(events),
    [events],
  );
  const missingLocations = useMemo(
    () => requestedLocations.filter((location) => {
      const key = eventMapLocationKey(location.city, location.province);
      return !cache.locations.has(key) && !cache.unavailable.has(key);
    }),
    [cache, requestedLocations],
  );
  const requestKey = JSON.stringify(missingLocations);
  const status: EventMapLocationsStatus = !isActive
    ? 'idle'
    : missingLocations.length === 0
      ? 'ready'
      : failedRequest === requestKey
        ? 'error'
        : 'loading';

  useEffect(() => {
    if (
      !isActive ||
      missingLocations.length === 0 ||
      failedRequest === requestKey
    ) return;

    const controller = new AbortController();

    void Promise.all(
      chunkLocations(missingLocations).map((chunk) =>
        getPublicEventLocations(chunk, controller.signal),
      ),
    )
      .then((locationBatches) => {
        const returnedKeys = new Set<string>();
        setCache((current) => {
          const nextLocations = new Map(current.locations);
          const nextUnavailable = new Set(current.unavailable);

          for (const location of locationBatches.flat()) {
            const key = eventMapLocationKey(location.city, location.province);
            returnedKeys.add(key);
            nextLocations.set(key, location);
          }

          for (const location of missingLocations) {
            const key = eventMapLocationKey(location.city, location.province);
            if (!returnedKeys.has(key)) nextUnavailable.add(key);
          }

          return {
            locations: nextLocations,
            unavailable: nextUnavailable,
          };
        });
        setFailedRequest(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFailedRequest(requestKey);
      });

    return () => controller.abort();
  }, [failedRequest, isActive, missingLocations, requestKey]);

  const activate = useCallback(() => {
    setFailedRequest(null);
    setIsActive(true);
  }, []);
  const retry = useCallback(() => setFailedRequest(null), []);
  const markers = useMemo(
    () => buildEventMapMarkers(events, [...cache.locations.values()]),
    [cache.locations, events],
  );

  return { activate, isActive, markers, retry, status };
}
