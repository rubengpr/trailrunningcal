// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventMapMarker } from '@/types/map.types';

const mocks = vi.hoisted(() => ({
  addControl: vi.fn(),
  addLayer: vi.fn(),
  addSource: vi.fn(),
  fitBounds: vi.fn(),
  jumpTo: vi.fn(),
  mapConstructor: vi.fn(),
  marker: vi.fn(),
  markerAddTo: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('maplibre-gl', () => {
  class NavigationControlMock {
    constructor(options: unknown) {
      mocks.addControl(options);
    }
  }

  class MapMock {
    constructor(options: unknown) {
      mocks.mapConstructor(options);
    }

    addControl() {
      return this;
    }

    addLayer(layer: unknown) {
      mocks.addLayer(layer);
      return this;
    }

    addSource(source: unknown) {
      mocks.addSource(source);
      return this;
    }

    fitBounds = mocks.fitBounds;
    getContainer() {
      return document.createElement('div');
    }
    jumpTo = mocks.jumpTo;
    on() {
      return this;
    }
    once() {
      return this;
    }
    off() {
      return this;
    }
    remove = mocks.remove;
  }

  class LngLatBoundsMock {
    extend() {
      return this;
    }
  }

  class PopupMock {
    setDOMContent() {
      return this;
    }

    on() {
      return this;
    }

    remove() {
      return this;
    }
  }

  class MarkerMock {
    private readonly element: HTMLElement;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      mocks.marker(options);
    }

    addTo() {
      mocks.markerAddTo();
      return this;
    }

    getElement() {
      return this.element;
    }

    setLngLat() {
      return this;
    }

    setPopup() {
      return this;
    }
  }

  return {
    default: {
      LngLatBounds: LngLatBoundsMock,
      Map: MapMock,
      Marker: MarkerMock,
      NavigationControl: NavigationControlMock,
      Popup: PopupMock,
    },
  };
});

import { EventsMap } from './events-map';

const labels = {
  previousEvent: 'Previous',
  nextEvent: 'Next',
  eventPageLink: 'Event page',
  dateTbd: 'Date to be confirmed',
};

function marker(
  city: string,
  latitude: number,
  longitude: number,
): EventMapMarker {
  return {
    city,
    province: 'Province',
    latitude,
    longitude,
    events: [{
      id: city,
      name: `Event in ${city}`,
      slug: city.toLowerCase(),
      dateRange: { startDate: '2026-10-01', endDate: '2026-10-01' },
      location: {
        city,
        province: 'Province',
        groups: [{ province: 'Province', cities: [city] }],
        isMultipleLocations: false,
      },
      distances: [{ id: `${city}-race`, distanceKm: 20 }],
    }],
  };
}

function renderMap(markers: EventMapMarker[]) {
  return render(
    <EventsMap
      markers={markers}
      locale="es"
      labels={labels}
    />,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(cleanup);

describe('EventsMap country framing', () => {
  it('keeps calendar results at the Spain overview', () => {
    renderMap([
      marker('A Coruña', 43.36, -8.41),
      marker('Almería', 36.84, -2.46),
    ]);

    expect(mocks.mapConstructor).toHaveBeenCalledWith(expect.objectContaining({
      bounds: [[-18.5, 27.4], [4.7, 44.1]],
      fitBoundsOptions: { padding: 24 },
    }));
    expect(mocks.fitBounds).not.toHaveBeenCalled();
    expect(mocks.jumpTo).not.toHaveBeenCalled();
  });

  it('does not fit the map to filtered or scoped results', () => {
    renderMap([
      marker('A Coruña', 43.36, -8.41),
      marker('Almería', 36.84, -2.46),
    ]);

    expect(mocks.fitBounds).not.toHaveBeenCalled();
  });

  it('does not zoom to a single available result', () => {
    renderMap([marker('Girona', 41.98, 2.82)]);

    expect(mocks.jumpTo).not.toHaveBeenCalled();
    expect(mocks.fitBounds).not.toHaveBeenCalled();
  });
});
