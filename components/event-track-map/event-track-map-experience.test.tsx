// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchEventTrackRoutes: vi.fn(),
  preloadEventTrackMap: vi.fn(),
}));

vi.mock('@/lib/api/event-tracks', () => ({
  fetchEventTrackRoutes: mocks.fetchEventTrackRoutes,
}));
vi.mock('@/components/event-track-map/deferred-event-track-map', () => ({
  EVENT_TRACK_MAP_CLASS_NAME: 'map-placeholder',
  EventTrackMapPlaceholder: () => <div data-testid="map-placeholder" />,
  preloadEventTrackMap: mocks.preloadEventTrackMap,
  DeferredEventTrackMap: () => <div data-testid="loaded-track-map" />,
}));
vi.mock('@/components/event-track-map/elevation-profile', () => ({
  ElevationProfileChart: () => <div />,
}));
vi.mock('@/lib/race-tracks/elevation-profile', () => ({
  buildElevationProfiles: () => [],
}));

import { EventTrackMapExperience } from '@/components/event-track-map/event-track-map-experience';

let intersectionCallback: IntersectionObserverCallback;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.fetchEventTrackRoutes.mockResolvedValue([{ id: 'route-1' }]);
  window.IntersectionObserver = class implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [0.25];

    constructor(callback: IntersectionObserverCallback) {
      intersectionCallback = callback;
    }
    disconnect(): void {}
    observe(): void {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
    unobserve(): void {}
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EventTrackMapExperience', () => {
  it('fetches tracks only once its placeholder becomes visible', async () => {
    render(
      <EventTrackMapExperience
        chartDescription="Elevation profile"
        errorMessage="Try again"
        errorTitle="Could not load map"
        eventId="event-1"
        eventSlug="event"
        locale="en"
        title="Map"
      />,
    );

    expect(mocks.fetchEventTrackRoutes).not.toHaveBeenCalled();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 0.25 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(mocks.fetchEventTrackRoutes).toHaveBeenCalledWith('event-1', 'en');
    expect(await screen.findByTestId('loaded-track-map')).toBeDefined();
  });

  it('removes the map section when no valid routes are returned', async () => {
    mocks.fetchEventTrackRoutes.mockResolvedValue([]);

    render(
      <EventTrackMapExperience
        chartDescription="Elevation profile"
        errorMessage="Try again"
        errorTitle="Could not load map"
        eventId="event-1"
        eventSlug="event"
        locale="en"
        title="Map"
      />,
    );

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 0.25 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await vi.waitFor(() => {
      expect(screen.queryByText('Map')).toBeNull();
    });
  });
});
