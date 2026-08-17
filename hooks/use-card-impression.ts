'use client';

import { useEffect, useRef } from 'react';
import { queueCardImpression } from '@/lib/analytics/card-impression-batcher';

interface UseCardImpressionParams {
  pageType?: 'homepage' | 'finder_type' | 'finder_province_distance';
  eventId: string;
  eventSlug: string;
  listPosition?: number;
}

const IMPRESSION_THRESHOLD = 0.5;

export function useCardImpression<T extends HTMLElement>({
  pageType,
  eventId,
  eventSlug,
  listPosition,
}: UseCardImpressionParams) {
  const targetRef = useRef<T>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || pageType === undefined || listPosition === undefined) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          queueCardImpression(pageType, { event_id: eventId, event_slug: eventSlug, list_position: listPosition });
          observer.disconnect();
        }
      },
      { threshold: IMPRESSION_THRESHOLD },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [pageType, eventId, eventSlug, listPosition]);

  return targetRef;
}
