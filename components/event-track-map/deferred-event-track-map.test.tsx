// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeferredEventTrackMap } from '@/components/event-track-map/deferred-event-track-map';

vi.mock('@/components/event-track-map/event-track-map', () => ({
  EventTrackMap: () => <div data-testid="loaded-track-map" />,
}));

const routes = [
  {
    id: 'route-1',
    raceIds: ['race-1'],
    raceNames: ['Marató'],
    distanceKm: 42,
    color: '#c026d3',
    lineWidth: 8,
    lineStyle: 'solid' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [[1.7, 42.2], [1.8, 42.3]],
    },
  },
];

let intersectionCallback: IntersectionObserverCallback;
const disconnect = vi.fn();

beforeEach(() => {
  disconnect.mockClear();
  window.IntersectionObserver = class implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [0.25];

    constructor(callback: IntersectionObserverCallback) {
      intersectionCallback = callback;
    }

    disconnect(): void {
      disconnect();
    }
    observe(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve(): void {}
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DeferredEventTrackMap', () => {
  it('loads only after a quarter of the placeholder is visible', async () => {
    const { container } = render(
      <DeferredEventTrackMap
        activePoint={null}
        eventId="event-1"
        eventSlug="pedraforca-xtrail"
        routes={routes}
        errorTitle="Error"
        errorMessage="Try another map"
      />,
    );

    const placeholder = container.querySelector(
      '[data-event-track-map-placeholder]',
    );
    expect(placeholder).not.toBeNull();
    expect(placeholder?.className).toContain('h-[336px]');
    expect(placeholder?.className).toContain('sm:h-[480px]');
    expect(screen.queryByTestId('loaded-track-map')).toBeNull();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 0.24 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(screen.queryByTestId('loaded-track-map')).toBeNull();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 0.25 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(await screen.findByTestId('loaded-track-map')).toBeDefined();
    expect(disconnect).toHaveBeenCalled();
  });
});
