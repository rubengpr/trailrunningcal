'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { MapExperimentContext } from '@/lib/maps/experiment';
import { track } from '@/lib/analytics/track';

export type MapAction = 'pan' | 'rotate' | 'zoom';

const MIN_ACTIONS = 7;
const MIN_ACTIVE_TIME_MS = 10_000;
const SAME_ACTION_DEBOUNCE_MS = 750;

interface UseMapDeepEngagementOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  eventId: string;
  eventSlug: string;
  experiment: MapExperimentContext | undefined;
  raceCount: number;
  routeCount: number;
}

export function useMapDeepEngagement({
  containerRef,
  eventId,
  eventSlug,
  experiment,
  raceCount,
  routeCount,
}: UseMapDeepEngagementOptions) {
  const actionCountRef = useRef(0);
  const actionTypesRef = useRef(new Set<MapAction>());
  const activeSinceRef = useRef<number | null>(null);
  const activeTimeMsRef = useRef(0);
  const isDocumentVisibleRef = useRef(
    typeof document === 'undefined' || document.visibilityState === 'visible',
  );
  const isFullscreenRef = useRef(false);
  const isMapVisibleRef = useRef(false);
  const lastActionAtRef = useRef(new Map<MapAction, number>());
  const startedRef = useRef(false);
  const sentRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const experimentRef = useRef(experiment);

  useEffect(() => {
    experimentRef.current = experiment;
  }, [experiment]);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const getActiveTime = useCallback(() => {
    const startedAt = activeSinceRef.current;
    return activeTimeMsRef.current + (startedAt === null ? 0 : performance.now() - startedAt);
  }, []);

  const canAccumulate = useCallback(
    () =>
      startedRef.current &&
      isMapVisibleRef.current &&
      isDocumentVisibleRef.current,
    [],
  );

  const emitIfQualified = useCallback(() => {
    const activeMapTimeMs = Math.round(getActiveTime());
    const currentExperiment = experimentRef.current;
    if (
      sentRef.current ||
      !currentExperiment ||
      actionCountRef.current < MIN_ACTIONS ||
      activeMapTimeMs < MIN_ACTIVE_TIME_MS
    ) {
      return;
    }

    sentRef.current = true;
    clearTimer();
    track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_DEEPLY_ENGAGED, {
      event_id: eventId,
      event_slug: eventSlug,
      ...currentExperiment,
      action_count: actionCountRef.current,
      action_types: [...actionTypesRef.current],
      active_map_time_ms: activeMapTimeMs,
      is_fullscreen: isFullscreenRef.current,
      route_count: routeCount,
      race_count: raceCount,
    });
  }, [clearTimer, eventId, eventSlug, getActiveTime, raceCount, routeCount]);

  const scheduleQualificationCheck = useCallback(() => {
    clearTimer();
    if (
      sentRef.current ||
      actionCountRef.current < MIN_ACTIONS ||
      !canAccumulate()
    ) {
      return;
    }
    const remainingMs = Math.max(0, MIN_ACTIVE_TIME_MS - getActiveTime());
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      emitIfQualified();
    }, remainingMs);
  }, [canAccumulate, clearTimer, emitIfQualified, getActiveTime]);

  const updateAccumulation = useCallback(() => {
    if (canAccumulate()) {
      if (activeSinceRef.current === null) activeSinceRef.current = performance.now();
    } else if (activeSinceRef.current !== null) {
      activeTimeMsRef.current = getActiveTime();
      activeSinceRef.current = null;
    }
    emitIfQualified();
    scheduleQualificationCheck();
  }, [canAccumulate, emitIfQualified, getActiveTime, scheduleQualificationCheck]);

  const start = useCallback(() => {
    if (!startedRef.current) startedRef.current = true;
    updateAccumulation();
  }, [updateAccumulation]);

  const recordAction = useCallback(
    (action: MapAction) => {
      start();
      const now = performance.now();
      const lastActionAt = lastActionAtRef.current.get(action);
      if (
        lastActionAt !== undefined &&
        now - lastActionAt < SAME_ACTION_DEBOUNCE_MS
      ) {
        return;
      }
      lastActionAtRef.current.set(action, now);
      actionCountRef.current += 1;
      actionTypesRef.current.add(action);
      emitIfQualified();
      scheduleQualificationCheck();
    },
    [emitIfQualified, scheduleQualificationCheck, start],
  );

  const setFullscreen = useCallback(
    (isFullscreen: boolean) => {
      isFullscreenRef.current = isFullscreen;
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === 'undefined') {
      isMapVisibleRef.current = true;
      updateAccumulation();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isMapVisibleRef.current = Boolean(
          entry?.isIntersecting && entry.intersectionRatio >= 0.5,
        );
        updateAccumulation();
      },
      { threshold: 0.5 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, updateAccumulation]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isDocumentVisibleRef.current = document.visibilityState === 'visible';
      updateAccumulation();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [updateAccumulation]);

  useEffect(
    () => () => clearTimer(),
    [clearTimer],
  );

  return { recordAction, setFullscreen, start };
}
