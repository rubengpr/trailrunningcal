'use client';

import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import type { RegionId } from '@/lib/geography/destinations';

interface EventPageViewTrackerProps {
  eventId: string;
  eventSlug: string;
  province: string | null;
  region: RegionId | null;
}

const READY_POLL_INTERVAL_MS = 200;
const READY_POLL_MAX_ATTEMPTS = 25;

export function EventPageViewTracker({
  eventId,
  eventSlug,
  province,
  region,
}: EventPageViewTrackerProps) {
  const trackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedSlugRef.current === eventSlug) return;

    let attempts = 0;
    let timeoutId: number | undefined;

    const trackView = () => {
      // posthog.init está diferido con requestIdleCallback, así que un capture
      // inmediato en mount puede llegar antes de la inicialización y perderse.
      if (!posthog.__loaded) {
        attempts += 1;
        if (attempts > READY_POLL_MAX_ATTEMPTS) return;
        timeoutId = window.setTimeout(trackView, READY_POLL_INTERVAL_MS);
        return;
      }

      trackedSlugRef.current = eventSlug;
      track(ANALYTICS_EVENTS.EVENT_PAGE_VIEWED, {
        event_id: eventId,
        event_slug: eventSlug,
        province,
        region,
      });
    };

    trackView();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [eventId, eventSlug, province, region]);

  return null;
}
