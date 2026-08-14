// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapDeepEngagement } from '@/hooks/use-map-deep-engagement';

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
let intersectionCallback: IntersectionObserverCallback;

vi.mock('@/lib/analytics/track', () => ({ track: mocks.track }));

beforeEach(() => {
  vi.useFakeTimers();
  window.IntersectionObserver = class implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [0.5];

    constructor(callback: IntersectionObserverCallback) {
      intersectionCallback = callback;
    }

    disconnect() {}
    observe() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve() {}
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('useMapDeepEngagement', () => {
  it('captures a single deep-engagement event after seven deliberate actions and ten active seconds', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const containerRef = { current: container };
    const { result } = renderHook(() =>
      useMapDeepEngagement({
        containerRef,
        eventId: 'event-1',
        eventSlug: 'pedraforca-xtrail',
        experiment: {
          device_form_factor: 'desktop',
          feature_flag_variant: '3d_preview',
          requested_preview_mode: '3d',
        },
        raceCount: 1,
        routeCount: 1,
      }),
    );

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      result.current.recordAction('pan');
      for (let index = 1; index < 7; index += 1) {
        vi.advanceTimersByTime(751);
        result.current.recordAction('pan');
      }
    });

    expect(mocks.track).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(10_000));

    expect(mocks.track).toHaveBeenCalledTimes(1);
    expect(mocks.track).toHaveBeenCalledWith(
      'event_track_map_deeply_engaged',
      expect.objectContaining({
        action_count: 7,
        action_types: ['pan'],
        feature_flag_variant: '3d_preview',
      }),
    );
  });

  it('pauses the active-time clock while the map is outside the viewport', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const containerRef = { current: container };
    const { result } = renderHook(() =>
      useMapDeepEngagement({
        containerRef,
        eventId: 'event-1',
        eventSlug: 'pedraforca-xtrail',
        experiment: {
          device_form_factor: 'mobile',
          feature_flag_variant: 'control',
          requested_preview_mode: '2d',
        },
        raceCount: 1,
        routeCount: 1,
      }),
    );

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      for (let index = 0; index < 7; index += 1) {
        if (index > 0) vi.advanceTimersByTime(751);
        result.current.recordAction('zoom');
      }
      intersectionCallback(
        [{ isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      vi.advanceTimersByTime(20_000);
    });

    expect(mocks.track).not.toHaveBeenCalled();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      vi.advanceTimersByTime(10_000);
    });

    expect(mocks.track).toHaveBeenCalledTimes(1);
  });
});
