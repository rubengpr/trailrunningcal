// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeferredEventsMap } from './deferred-events-map';

vi.mock('@/components/events-map/events-map', () => ({
  EventsMap: () => <div data-testid="events-map" />,
}));

const labels = {
  previousEvent: 'Anterior',
  nextEvent: 'Siguiente',
  eventPageLink: 'Ver evento',
  dateTbd: 'Fecha pendiente',
};

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

describe('DeferredEventsMap', () => {
  it('loads the map only after at least a quarter is visible', async () => {
    const onVisible = vi.fn();
    const { container } = render(
      <DeferredEventsMap
        markers={[]}
        locale="es"
        labels={labels}
        onVisible={onVisible}
        className="h-[640px]"
      />,
    );

    expect(container.querySelector('[data-map-placeholder]')).not.toBeNull();
    expect(screen.queryByTestId('events-map')).toBeNull();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 0.24 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(screen.queryByTestId('events-map')).toBeNull();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 0.25 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(await screen.findByTestId('events-map')).toBeDefined();
    expect(onVisible).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalled();
  });

  it('keeps the placeholder until map data is ready', async () => {
    const { container, rerender } = render(
      <DeferredEventsMap
        markers={[]}
        locale="es"
        labels={labels}
        isReady={false}
      />,
    );

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(container.querySelector('[data-map-placeholder]')).not.toBeNull();
    expect(screen.queryByTestId('events-map')).toBeNull();

    rerender(
      <DeferredEventsMap
        markers={[]}
        locale="es"
        labels={labels}
        isReady
      />,
    );

    expect(await screen.findByTestId('events-map')).toBeDefined();
  });
});
