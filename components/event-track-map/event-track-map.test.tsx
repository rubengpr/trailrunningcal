// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventTrackMap } from '@/components/event-track-map/event-track-map';

interface MapMockEvent {
  isSourceLoaded?: boolean;
  originalEvent?: Event;
  error?: { message: string };
  sourceId?: string;
}

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (event?: MapMockEvent) => void>(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  addImage: vi.fn(),
  addControl: vi.fn(),
  easeTo: vi.fn(),
  fitBounds: vi.fn(),
  setLayoutProperty: vi.fn(),
  setPaintProperty: vi.fn(),
  setTerrain: vi.fn(),
  remove: vi.fn(),
  resize: vi.fn(),
  navigationControl: vi.fn(),
  mapConstructor: vi.fn(),
  marker: vi.fn(),
  markerAddTo: vi.fn(),
  markerRemove: vi.fn(),
  popupAddTo: vi.fn(),
  popupRemove: vi.fn(),
  popupSetDOMContent: vi.fn(),
  track: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      routeFinish: 'Meta',
      routeStart: 'Salida',
    })[key] ?? key,
}));

vi.mock('@/lib/analytics/track', () => ({ track: mocks.track }));

vi.mock('maplibre-gl', () => {
  class AttributionControlMock {}
  class NavigationControlMock {
    constructor(options: unknown) {
      mocks.navigationControl(options);
    }
  }

  class MapMock {
    private container: HTMLElement;
    private bearing = 0;
    private layers = new Set<string>(['osm']);
    private sources = new Set<string>();
    private terrain: unknown = null;

    constructor(options: { container: HTMLElement }) {
      this.container = options.container;
      mocks.mapConstructor(options);
    }

    getContainer() {
      return this.container;
    }

    addControl(control: unknown, position: string) {
      mocks.addControl(control, position);
      if (control instanceof AttributionControlMock) {
        const attribution = document.createElement('details');
        attribution.className =
          'maplibregl-ctrl-attrib maplibregl-compact maplibregl-compact-show';
        this.container.append(attribution);
      }
      return this;
    }

    addSource(id: string, source: unknown) {
      mocks.addSource(id, source);
      this.sources.add(id);
      return this;
    }

    addImage(id: string, image: unknown, options: unknown) {
      mocks.addImage(id, image, options);
      return this;
    }

    getSource(id: string) {
      return this.sources.has(id) ? {} : undefined;
    }

    addLayer(layer: { id: string }, beforeId?: string) {
      if (beforeId) mocks.addLayer(layer, beforeId);
      else mocks.addLayer(layer);
      this.layers.add(layer.id);
      return this;
    }

    getLayer(id: string) {
      return this.layers.has(id) ? {} : undefined;
    }

    setLayoutProperty(id: string, property: string, value: unknown) {
      mocks.setLayoutProperty(id, property, value);
      return this;
    }

    setPaintProperty(id: string, property: string, value: unknown) {
      mocks.setPaintProperty(id, property, value);
      return this;
    }

    setTerrain(terrain: unknown) {
      mocks.setTerrain(terrain);
      this.terrain = terrain;
      return this;
    }

    getTerrain() {
      return this.terrain;
    }

    getBearing() {
      return this.bearing;
    }

    easeTo(options: { bearing: number; duration: number }) {
      mocks.easeTo(options);
      this.bearing = options.bearing;
      return this;
    }

    fitBounds = mocks.fitBounds;
    remove = mocks.remove;
    resize = mocks.resize;

    on(event: string, handler: (event?: MapMockEvent) => void) {
      mocks.handlers.set(event, handler);
      return this;
    }
  }

  class BoundsMock {
    extend() {
      return this;
    }
  }

  class PopupMock {
    private content?: HTMLElement;

    setLngLat() {
      return this;
    }

    setDOMContent(content: HTMLElement) {
      this.content = content;
      mocks.popupSetDOMContent(content);
      return this;
    }

    addTo() {
      mocks.popupAddTo(this.content);
      return this;
    }

    remove() {
      mocks.popupRemove();
      return this;
    }
  }

  class MarkerMock {
    private element: HTMLElement;

    constructor(options: { element: HTMLElement; opacityWhenCovered?: string }) {
      this.element = options.element;
      mocks.marker(options);
    }

    setLngLat() {
      return this;
    }

    setPopup() {
      return this;
    }

    addTo(map: MapMock) {
      map.getContainer().append(this.element);
      mocks.markerAddTo();
      return this;
    }

    remove() {
      this.element.remove();
      mocks.markerRemove();
      return this;
    }
  }

  return {
    default: {
      Map: MapMock,
      NavigationControl: NavigationControlMock,
      AttributionControl: AttributionControlMock,
      LngLatBounds: BoundsMock,
      Marker: MarkerMock,
      Popup: PopupMock,
    },
  };
});

const props = {
  eventId: 'event-1',
  eventSlug: 'pedraforca-xtrail',
  errorTitle: 'Map failed',
  errorMessage: 'Use the individual maps',
  routes: [
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
        coordinates: [
          [1.7, 42.2],
          [1.8, 42.3],
        ],
      },
    },
  ],
};

beforeEach(() => {
  mocks.handlers.clear();
  vi.resetAllMocks();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: 0,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('EventTrackMap', () => {
  it('renders a translucent in-map legend with color dots', () => {
    render(<EventTrackMap {...props} />);

    expect(screen.getByTestId('event-track-map-legend')).toBeDefined();
    expect(screen.getByText('Marató')).toBeDefined();
    expect(
      screen.getByTestId('event-track-map-legend-dot-route-1').style.backgroundColor,
    ).toBe('rgb(192, 38, 211)');

    const map = screen.getByTestId('event-track-map');
    expect(map.className).toContain('event-track-map');
    expect(map.className).toContain('h-full');
    expect(map.className).toContain('w-full');
    expect(mocks.addControl).toHaveBeenCalledTimes(2);
    expect(mocks.navigationControl).toHaveBeenCalledWith({
      showCompass: false,
      showZoom: true,
      visualizePitch: false,
    });
    expect(mocks.addControl).toHaveBeenNthCalledWith(1, expect.anything(), 'top-right');
    expect(mocks.addControl).toHaveBeenNthCalledWith(2, expect.anything(), 'top-right');
    expect(map.querySelector('.maplibregl-compact-show')).toBeNull();
    expect(screen.getByTestId('event-track-map-terrain-toggle')).toBeDefined();
    const compass = screen.getByTestId('event-track-map-rotation-button');
    expect(screen.getByTestId('event-track-map-rotate-left')).toBeDefined();
    expect(screen.getByTestId('event-track-map-rotate-right')).toBeDefined();
    expect(compass.querySelector('svg')?.getAttribute('stroke-width')).toBe('2');
    expect(
      screen
        .getByTestId('event-track-map-rotate-left')
        .querySelector('svg')
        ?.getAttribute('stroke-width'),
    ).toBe('2');
    expect(
      screen
        .getByTestId('event-track-map-rotate-right')
        .querySelector('svg')
        ?.getAttribute('stroke-width'),
    ).toBe('2');

    map
      .querySelector('.maplibregl-ctrl-attrib')
      ?.classList.add('maplibregl-compact-show');
    act(() => mocks.handlers.get('load')?.());
    expect(map.querySelector('.maplibregl-compact-show')).toBeNull();
    fireEvent.click(compass);
    expect(mocks.easeTo).toHaveBeenLastCalledWith({ bearing: -30, duration: 350 });
  });

  it('renders the terrain controls for every event', () => {
    render(<EventTrackMap {...props} eventSlug="trail-moixero" />);

    expect(screen.getByTestId('event-track-map-terrain-toggle')).toBeDefined();
    expect(screen.getByTestId('event-track-map-rotation-button')).toBeDefined();
    expect(screen.getByTestId('event-track-map-rotate-left')).toBeDefined();
    expect(screen.getByTestId('event-track-map-rotate-right')).toBeDefined();
    expect(screen.getByTestId('event-track-map-fullscreen-toggle')).toBeDefined();
    expect(mocks.navigationControl).toHaveBeenCalledWith({
      showCompass: false,
      showZoom: true,
      visualizePitch: false,
    });
  });

  it('adds repeated direction chevrons that follow the GPX line', () => {
    render(<EventTrackMap {...props} />);

    act(() => mocks.handlers.get('load')?.());

    expect(mocks.addImage).toHaveBeenCalledWith(
      'event-track-direction-arrow',
      expect.objectContaining({
        width: 24,
        height: 24,
        data: expect.any(Uint8Array),
      }),
      { pixelRatio: 2 },
    );
    expect(mocks.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'event-track-direction-0',
        type: 'symbol',
        layout: expect.objectContaining({
          'symbol-placement': 'line',
          'symbol-spacing': 140,
          'icon-image': 'event-track-direction-arrow',
          'icon-keep-upright': false,
          'icon-pitch-alignment': 'map',
          'icon-rotation-alignment': 'map',
        }),
      }),
    );
  });

  it('enters and exits viewport fullscreen and resizes the map', async () => {
    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    const button = screen.getByTestId('event-track-map-fullscreen-toggle');
    const anchor = screen.getByTestId('event-track-map-anchor');
    const portalHost = document.querySelector(
      '[data-event-track-map-portal]',
    ) as HTMLElement;

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 320,
    });

    expect(button.title).toBe('enterFullscreen');
    expect(portalHost.parentElement).toBe(anchor);
    expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);
    button.focus();
    fireEvent.click(button);

    expect(portalHost.parentElement).toBe(document.body);
    expect(
      portalHost.querySelector('[data-map-fullscreen="true"]'),
    ).not.toBeNull();
    expect(
      portalHost.querySelector('.event-track-map-portal-fullscreen'),
    ).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-320px');
    expect(button.title).toBe('exitFullscreen');
    expect(document.activeElement).toBe(button);
    await waitFor(() => expect(mocks.resize).toHaveBeenCalled());
    expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);
    expect(mocks.remove).not.toHaveBeenCalled();

    const resizeCount = mocks.resize.mock.calls.length;
    fireEvent(window, new Event('orientationchange'));
    await waitFor(() =>
      expect(mocks.resize.mock.calls.length).toBeGreaterThan(resizeCount),
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(portalHost.parentElement).toBe(anchor);
    expect(
      portalHost.querySelector('[data-map-fullscreen="true"]'),
    ).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 320);
    expect(button.title).toBe('enterFullscreen');
    expect(document.activeElement).toBe(button);
    expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);
  });

  it('preserves 3D settings and cleans up a fullscreen portal on unmount', () => {
    const view = render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    const terrainButton = screen.getByTestId('event-track-map-terrain-toggle');
    fireEvent.click(terrainButton);
    fireEvent.click(terrainButton);
    fireEvent.change(screen.getByTestId('event-track-map-pitch'), {
      target: { value: '70' },
    });
    fireEvent.change(screen.getByTestId('event-track-map-exaggeration'), {
      target: { value: '1.5' },
    });
    fireEvent.click(screen.getByTestId('event-track-map-fullscreen-toggle'));

    expect(
      (screen.getByTestId('event-track-map-pitch') as HTMLInputElement).value,
    ).toBe('70');
    expect(
      (screen.getByTestId('event-track-map-exaggeration') as HTMLInputElement)
        .value,
    ).toBe('1.5');
    expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);

    view.unmount();

    expect(document.querySelector('[data-event-track-map-portal]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
  });

  it('keeps an exit control and restores scrolling when the map fails fullscreen', async () => {
    mocks.addSource.mockImplementationOnce(() => {
      throw new Error('route setup failed');
    });
    render(<EventTrackMap {...props} />);
    const anchor = screen.getByTestId('event-track-map-anchor');
    const portalHost = document.querySelector(
      '[data-event-track-map-portal]',
    ) as HTMLElement;
    fireEvent.click(screen.getByTestId('event-track-map-fullscreen-toggle'));

    act(() => mocks.handlers.get('load')?.());

    await waitFor(() => expect(screen.getByText('Map failed')).toBeDefined());
    expect(portalHost.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByTestId('event-track-map-fullscreen-toggle'));

    expect(portalHost.parentElement).toBe(anchor);
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
  });

  it('lazily enables and disables terrain without recreating its sources', () => {
    render(<EventTrackMap {...props} />);
    const button = screen.getByTestId(
      'event-track-map-terrain-toggle',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('3D');
    expect(mocks.addSource).not.toHaveBeenCalled();

    act(() => mocks.handlers.get('load')?.());
    expect(button.disabled).toBe(false);
    expect(button.title).toBe('view3D');
    expect(mocks.addSource).toHaveBeenCalledTimes(1);

    fireEvent.click(button);

    expect(mocks.addSource).toHaveBeenCalledTimes(4);
    expect(mocks.addSource).toHaveBeenCalledWith(
      'event-terrain',
      expect.objectContaining({
        maxzoom: 17,
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
      }),
    );
    expect(mocks.addSource).toHaveBeenCalledWith(
      'event-orthophoto',
      expect.objectContaining({
        type: 'raster',
        tiles: [
          'https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/{z}/{x}/{y}.png',
        ],
      }),
    );
    expect(mocks.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'event-orthophoto',
        source: 'event-orthophoto',
        type: 'raster',
      }),
      'event-track-casing-0',
    );
    expect(mocks.addLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'event-terrain-hillshade',
        type: 'hillshade',
      }),
      'event-track-casing-0',
    );
    expect(mocks.setTerrain).toHaveBeenLastCalledWith({
      source: 'event-terrain',
      exaggeration: 1,
    });
    expect(mocks.setLayoutProperty).toHaveBeenCalledWith(
      'osm',
      'visibility',
      'none',
    );
    expect(mocks.fitBounds).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ bearing: -20, duration: 700, pitch: 60 }),
    );
    expect(button.title).toBe('terrainSettings');
    expect(button.textContent).toBe('3D');
    expect(mocks.track).toHaveBeenLastCalledWith(
      'event_track_map_terrain_toggled',
      expect.objectContaining({ mode: '3d' }),
    );

    fireEvent.click(button);
    expect(screen.getByTestId('event-track-map-terrain-settings')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'view2D' }));

    expect(mocks.addSource).toHaveBeenCalledTimes(4);
    expect(mocks.setTerrain).toHaveBeenLastCalledWith(null);
    expect(mocks.setLayoutProperty).toHaveBeenCalledWith(
      'event-terrain-hillshade',
      'visibility',
      'none',
    );
    expect(mocks.setLayoutProperty).toHaveBeenCalledWith(
      'event-orthophoto',
      'visibility',
      'none',
    );
    expect(mocks.setLayoutProperty).toHaveBeenCalledWith(
      'osm',
      'visibility',
      'visible',
    );
    expect(mocks.fitBounds).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ bearing: 0, duration: 700, pitch: 0 }),
    );
    expect(button.title).toBe('view3D');
    expect(mocks.track).toHaveBeenLastCalledWith(
      'event_track_map_terrain_toggled',
      expect.objectContaining({ mode: '2d' }),
    );
  });

  it('hides terrain settings in production and toggles directly back to 2D', () => {
    vi.stubEnv('NODE_ENV', 'production');
    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    const button = screen.getByTestId('event-track-map-terrain-toggle');

    fireEvent.click(button);

    expect(button.title).toBe('view2D');
    expect(screen.queryByTestId('event-track-map-terrain-settings')).toBeNull();

    fireEvent.click(button);

    expect(mocks.setTerrain).toHaveBeenLastCalledWith(null);
    expect(button.title).toBe('view3D');
    expect(screen.queryByTestId('event-track-map-terrain-settings')).toBeNull();
  });

  it('updates bounded 3D angle, relief, and hillshade live and resets them', () => {
    vi.useFakeTimers();
    try {
      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      const terrainButton = screen.getByTestId('event-track-map-terrain-toggle');
      fireEvent.click(terrainButton);
      fireEvent.click(terrainButton);

      const pitch = screen.getByTestId(
        'event-track-map-pitch',
      ) as HTMLInputElement;
      const relief = screen.getByTestId(
        'event-track-map-exaggeration',
      ) as HTMLInputElement;
      const hillshade = screen.getByTestId(
        'event-track-map-hillshade',
      ) as HTMLInputElement;
      expect(pitch.value).toBe('60');
      expect(relief.value).toBe('1');
      expect(hillshade.value).toBe('0.18');

      fireEvent.change(pitch, { target: { value: '70' } });
      fireEvent.change(relief, { target: { value: '1.5' } });
      fireEvent.change(hillshade, { target: { value: '0.6' } });
      act(() => vi.advanceTimersByTime(20));

      expect(mocks.easeTo).toHaveBeenLastCalledWith({ pitch: 70, duration: 0 });
      expect(mocks.setTerrain).toHaveBeenLastCalledWith({
        source: 'event-terrain',
        exaggeration: 1.5,
      });
      expect(mocks.setPaintProperty).toHaveBeenLastCalledWith(
        'event-terrain-hillshade',
        'hillshade-exaggeration',
        0.6,
      );

      fireEvent.click(screen.getByRole('button', { name: 'terrainReset' }));
      act(() => vi.advanceTimersByTime(20));
      expect(pitch.value).toBe('60');
      expect(relief.value).toBe('1');
      expect(hillshade.value).toBe('0.18');
      expect(mocks.easeTo).toHaveBeenLastCalledWith({ pitch: 60, duration: 0 });
      expect(mocks.setTerrain).toHaveBeenLastCalledWith({
        source: 'event-terrain',
        exaggeration: 1,
      });
      expect(mocks.setPaintProperty).toHaveBeenLastCalledWith(
        'event-terrain-hillshade',
        'hillshade-exaggeration',
        0.18,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the 2D map when terrain loading fails', async () => {
    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    const button = screen.getByTestId(
      'event-track-map-terrain-toggle',
    ) as HTMLButtonElement;

    fireEvent.click(button);
    act(() =>
      mocks.handlers.get('error')?.({
        sourceId: 'event-orthophoto',
        error: { message: 'Orthophoto request failed' },
      }),
    );

    await waitFor(() => expect(button.disabled).toBe(true));
    expect(button.title).toBe('terrainUnavailable');
    expect(mocks.setTerrain).toHaveBeenLastCalledWith(null);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(screen.getByTestId('event-track-map')).toBeDefined();
  });

  it('keeps terrain active when a tile fails after DEM data has loaded', () => {
    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    const button = screen.getByTestId(
      'event-track-map-terrain-toggle',
    ) as HTMLButtonElement;
    fireEvent.click(button);

    act(() =>
      mocks.handlers.get('sourcedata')?.({
        sourceId: 'event-terrain',
        isSourceLoaded: true,
      }),
    );
    mocks.setTerrain.mockClear();
    act(() =>
      mocks.handlers.get('error')?.({
        sourceId: 'event-terrain',
        error: { message: 'High-zoom tile request failed' },
      }),
    );

    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(mocks.setTerrain).not.toHaveBeenCalledWith(null);
  });

  it('rotates by 30 degrees in either direction and tracks the interaction once', () => {
    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    fireEvent.click(screen.getByTestId('event-track-map-terrain-toggle'));
    expect(screen.getByTestId('event-track-map-rotation-hint')).toBeDefined();
    expect(screen.getByTestId('event-track-map-gesture-icon')).toBeDefined();
    mocks.track.mockClear();

    act(() => mocks.handlers.get('rotatestart')?.({}));
    expect(mocks.track).not.toHaveBeenCalled();
    expect(screen.getByTestId('event-track-map-rotation-hint')).toBeDefined();

    const rotateRight = screen.getByTestId('event-track-map-rotate-right');
    const rotateLeft = screen.getByTestId('event-track-map-rotate-left');
    fireEvent.click(rotateRight);
    expect(screen.queryByTestId('event-track-map-rotation-hint')).toBeNull();
    expect(mocks.easeTo).toHaveBeenLastCalledWith({ bearing: -30, duration: 350 });
    expect(mocks.track).toHaveBeenCalledWith(
      'event_track_map_interacted',
      expect.objectContaining({ interaction: 'rotate' }),
    );

    fireEvent.click(rotateRight);
    expect(mocks.easeTo).toHaveBeenLastCalledWith({ bearing: -60, duration: 350 });

    fireEvent.click(rotateLeft);
    expect(mocks.easeTo).toHaveBeenLastCalledWith({ bearing: -30, duration: 350 });

    act(() =>
      mocks.handlers.get('dragstart')?.({ originalEvent: new MouseEvent('mousedown') }),
    );
    expect(mocks.track).toHaveBeenCalledTimes(1);
  });

  it('automatically dismisses the rotation hint and shows it only once', () => {
    vi.useFakeTimers();
    try {
      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      const button = screen.getByTestId('event-track-map-terrain-toggle');

      fireEvent.click(button);
      expect(screen.getByTestId('event-track-map-rotation-hint')).toBeDefined();

      act(() => vi.advanceTimersByTime(6000));
      expect(screen.queryByTestId('event-track-map-rotation-hint')).toBeNull();

      fireEvent.click(button);
      fireEvent.click(button);
      expect(screen.queryByTestId('event-track-map-rotation-hint')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the fallback and removes the map when route setup fails', async () => {
    mocks.addSource.mockImplementationOnce(() => {
      throw new Error('Invalid source');
    });
    render(<EventTrackMap {...props} />);

    act(() => mocks.handlers.get('load')?.());

    expect(await screen.findByText('Map failed')).toBeDefined();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('removes the map on unmount after successful setup', async () => {
    const view = render(<EventTrackMap {...props} />);

    act(() => mocks.handlers.get('load')?.());
    await waitFor(() => expect(mocks.track).toHaveBeenCalledTimes(1));
    view.unmount();

    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.markerRemove).toHaveBeenCalledTimes(2);
    expect(mocks.popupRemove).toHaveBeenCalledTimes(2);
  });

  it('renders subtle translated start and finish markers with race details', () => {
    render(<EventTrackMap {...props} />);

    act(() => mocks.handlers.get('load')?.());

    const map = screen.getByTestId('event-track-map');
    const markers = map.querySelectorAll('[data-track-endpoint-marker]');
    expect(markers).toHaveLength(2);
    expect(markers[0]?.querySelector('.lucide-play')).not.toBeNull();
    expect(markers[0]?.querySelector('.lucide-flag')).toBeNull();
    expect(markers[1]?.querySelector('.lucide-flag')).not.toBeNull();
    expect(markers[1]?.querySelector('.lucide-play')).toBeNull();
    expect(markers[0]?.getAttribute('title')).toBe('Salida: Marató');
    expect(markers[1]?.getAttribute('title')).toBe('Meta: Marató');
    expect(mocks.marker).toHaveBeenCalledWith(
      expect.objectContaining({ opacityWhenCovered: '0.35' }),
    );

    const popupContents = mocks.popupSetDOMContent.mock.calls.map(
      ([content]) => (content as HTMLElement).textContent,
    );
    expect(popupContents).toEqual(['SalidaMarató', 'MetaMarató']);
    const popupDots = mocks.popupSetDOMContent.mock.calls.map(([content]) =>
      (content as HTMLElement).querySelector(
        '.event-track-map-endpoint-popup-dot',
      ),
    );
    expect(popupDots).toHaveLength(2);
    expect(popupDots[0]?.getAttribute('style')).toContain(
      'background-color: rgb(192, 38, 211)',
    );
    expect(popupDots[1]?.getAttribute('style')).toContain(
      'background-color: rgb(192, 38, 211)',
    );
  });

  it('renders a walking route as a dashed overlay above a shared solid route', () => {
    const sharedRoute = props.routes[0]!;
    render(
      <EventTrackMap
        {...props}
        routes={[
          {
            ...sharedRoute,
            id: 'walking-route',
            raceIds: ['walk'],
            raceNames: ['Caminada'],
            color: '#eab308',
            lineWidth: 3,
            lineStyle: 'dashed',
          },
          {
            ...sharedRoute,
            id: 'short-route',
            raceIds: ['short'],
            raceNames: ['Short'],
            color: '#16a34a',
            lineWidth: 4,
          },
        ]}
      />,
    );

    act(() => mocks.handlers.get('load')?.());

    expect(mocks.addLayer).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        id: 'event-track-line-1',
        paint: expect.objectContaining({ 'line-width': 4 }),
      }),
    );
    expect(mocks.addLayer).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        id: 'event-track-line-0',
        paint: expect.objectContaining({
          'line-color': '#eab308',
          'line-dasharray': [1.5, 1.5],
          'line-width': 3,
        }),
      }),
    );
  });
});
