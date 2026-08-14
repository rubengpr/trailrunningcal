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
  setSourceTiles: vi.fn(),
  setSourceUrl: vi.fn(),
  setSourceData: vi.fn(),
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
  featureFlagVariant: 'control' as 'control' | '3d_preview' | undefined,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      routeFinish: 'Meta',
      routeStart: 'Salida',
    })[key] ?? key,
}));

vi.mock('@/lib/analytics/track', () => ({ track: mocks.track }));

vi.mock('@/hooks/use-feature-flag-variant', () => ({
  useFeatureFlagVariant: () => mocks.featureFlagVariant,
}));

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
    private listeners = new Map<
      string,
      Set<(event?: MapMockEvent) => void>
    >();
    private layers = new Set<string>(['osm']);
    private sources = new Map<
      string,
      {
        setData: typeof mocks.setSourceData;
        setTiles: typeof mocks.setSourceTiles;
        setUrl: typeof mocks.setSourceUrl;
      }
    >();
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
      this.sources.set(id, {
        setData: mocks.setSourceData,
        setTiles: mocks.setSourceTiles,
        setUrl: mocks.setSourceUrl,
      });
      return this;
    }

    addImage(id: string, image: unknown, options: unknown) {
      mocks.addImage(id, image, options);
      return this;
    }

    getSource(id: string) {
      return this.sources.get(id);
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
      const listeners = this.listeners.get(event) ?? new Set();
      listeners.add(handler);
      this.listeners.set(event, listeners);
      mocks.handlers.set(event, (payload) => {
        for (const listener of [...(this.listeners.get(event) ?? [])]) {
          listener(payload);
        }
      });
      return this;
    }

    off(event: string, handler: (event?: MapMockEvent) => void) {
      this.listeners.get(event)?.delete(handler);
      return this;
    }

    once(event: string, handler: (event?: MapMockEvent) => void) {
      const onceHandler = (payload?: MapMockEvent) => {
        this.off(event, onceHandler);
        handler(payload);
      };
      this.on(event, onceHandler);
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
  activePoint: null,
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

function finishTerrainLoading(): void {
  act(() => {
    for (const sourceId of [
      'event-terrain',
      'event-terrain-hillshade',
      'event-orthophoto',
    ]) {
      mocks.handlers.get('sourcedata')?.({
        sourceId,
        isSourceLoaded: true,
      });
    }
    mocks.handlers.get('idle')?.();
  });
}

beforeEach(() => {
  mocks.handlers.clear();
  vi.resetAllMocks();
  mocks.featureFlagVariant = 'control';
  window.history.replaceState({}, '', '/');
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
  it('waits for the experiment assignment, then falls back to an untracked 2D map', () => {
    vi.useFakeTimers();
    try {
      mocks.featureFlagVariant = undefined;
      render(<EventTrackMap {...props} />);

      expect(screen.getByTestId('event-track-map-placeholder')).toBeDefined();
      expect(mocks.mapConstructor).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(3_000));
      expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);

      act(() => mocks.handlers.get('load')?.());
      expect(mocks.track).toHaveBeenCalledWith(
        'event_track_map_viewed',
        expect.not.objectContaining({ feature_flag_variant: expect.anything() }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('requests 3D terrain immediately for the 3D preview variant', () => {
    mocks.featureFlagVariant = '3d_preview';

    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());

    expect(
      screen
        .getByTestId('event-track-map')
        .parentElement?.getAttribute('data-terrain-status'),
    ).toBe('loading');
    expect(mocks.track).toHaveBeenCalledWith(
      'event_track_map_viewed',
      expect.objectContaining({
        feature_flag_variant: '3d_preview',
        requested_preview_mode: '3d',
      }),
    );
  });

  it('automatically requests lightweight 3D after showing the 2D fallback', () => {
    vi.useFakeTimers();
    try {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      window.history.replaceState({}, '', '/?event-map-3d=auto');
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { effectiveType: '4g', saveData: false },
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        configurable: true,
        value: 4,
      });

      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('2d');

      act(() => vi.advanceTimersByTime(500));

      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('loading');
      expect(mocks.addSource).toHaveBeenCalledWith(
        'event-terrain',
        expect.objectContaining({ type: 'raster-dem' }),
      );
      expect(mocks.addSource).toHaveBeenCalledWith(
        'event-orthophoto',
        expect.objectContaining({ type: 'raster' }),
      );
      expect(mocks.addSource).not.toHaveBeenCalledWith(
        'event-terrain-hillshade',
        expect.anything(),
      );

      act(() => {
        mocks.handlers.get('sourcedata')?.({
          sourceId: 'event-terrain',
          isSourceLoaded: true,
        });
        mocks.handlers.get('sourcedata')?.({
          sourceId: 'event-orthophoto',
          isSourceLoaded: true,
        });
        mocks.handlers.get('idle')?.();
      });

      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('3d');
      expect(mocks.track).toHaveBeenCalledWith(
        'event_track_map_terrain_load_finished',
        expect.objectContaining({ outcome: 'ready' }),
      );
      expect(mocks.track).toHaveBeenCalledWith(
        'event_track_map_terrain_toggled',
        expect.objectContaining({ mode: '3d' }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the mobile preview in 2D until it opens fullscreen', () => {
    vi.useFakeTimers();
    try {
      window.history.replaceState({}, '', '/?event-map-3d=auto');
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { effectiveType: '4g', saveData: false },
      });

      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      act(() => vi.advanceTimersByTime(500));

      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('2d');

      fireEvent.click(screen.getByTestId('event-track-map-preview-toggle'));
      act(() => vi.advanceTimersByTime(500));

      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('loading');
      expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps automatic 3D off on 3G but honors an explicit request', () => {
    vi.useFakeTimers();
    try {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      window.history.replaceState({}, '', '/?event-map-3d=auto');
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { effectiveType: '3g', saveData: false },
      });

      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      act(() => vi.advanceTimersByTime(500));

      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('2d');
      expect(mocks.addSource).not.toHaveBeenCalledWith(
        'event-terrain',
        expect.anything(),
      );

      fireEvent.click(screen.getByTestId('event-track-map-terrain-toggle'));

      expect(mocks.addSource).toHaveBeenCalledWith(
        'event-terrain-hillshade',
        expect.objectContaining({ type: 'raster-dem' }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not enable the automatic 3D preview in production', () => {
    vi.useFakeTimers();
    vi.stubEnv('NODE_ENV', 'production');
    try {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      window.history.replaceState({}, '', '/?event-map-3d=auto');
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { effectiveType: '4g', saveData: false },
      });

      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      act(() => vi.advanceTimersByTime(500));

      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('2d');
      expect(mocks.addSource).not.toHaveBeenCalledWith(
        'event-terrain',
        expect.anything(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps timeout and retry recovery for lightweight automatic 3D', () => {
    vi.useFakeTimers();
    try {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      window.history.replaceState({}, '', '/?event-map-3d=auto');
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { effectiveType: '4g', saveData: false },
      });

      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      act(() => vi.advanceTimersByTime(20_500));

      expect(
        screen.getByTestId('event-track-map-terrain-status').textContent,
      ).toContain('terrainLoadFailed');
      expect(mocks.track).toHaveBeenCalledWith(
        'event_track_map_terrain_load_finished',
        expect.objectContaining({ outcome: 'timeout' }),
      );

      fireEvent.click(
        screen
          .getByTestId('event-track-map-terrain-status')
          .querySelector('button')!,
      );

      expect(mocks.setSourceUrl).toHaveBeenCalledOnce();
      expect(mocks.setSourceTiles).toHaveBeenCalledOnce();
      act(() => {
        mocks.handlers.get('sourcedata')?.({
          sourceId: 'event-terrain',
          isSourceLoaded: true,
        });
        mocks.handlers.get('sourcedata')?.({
          sourceId: 'event-orthophoto',
          isSourceLoaded: true,
        });
        mocks.handlers.get('idle')?.();
      });

      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('3d');
    } finally {
      vi.useRealTimers();
    }
  });

  it('updates a profile point source without recreating the map', () => {
    const view = render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());

    expect(mocks.addSource).toHaveBeenCalledWith(
      'event-track-profile-point',
      expect.objectContaining({ type: 'geojson' }),
    );
    expect(mocks.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'event-track-profile-point',
        source: 'event-track-profile-point',
        type: 'circle',
      }),
    );

    view.rerender(
      <EventTrackMap
        {...props}
        activePoint={{
          color: '#c026d3',
          coordinate: [1.75, 42.25],
          distanceKm: 12.3,
          elevationM: 1_420,
          routeId: 'route-1',
          slopePercent: 8.4,
        }}
      />,
    );

    expect(mocks.setSourceData).toHaveBeenLastCalledWith({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { color: '#c026d3' },
          geometry: { type: 'Point', coordinates: [1.75, 42.25] },
        },
      ],
    });
    expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);

    view.rerender(<EventTrackMap {...props} activePoint={null} />);
    expect(mocks.setSourceData).toHaveBeenLastCalledWith({
      type: 'FeatureCollection',
      features: [],
    });
    expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);
  });

  it('applies a pending profile point when the deferred map loads', () => {
    render(
      <EventTrackMap
        {...props}
        activePoint={{
          color: '#c026d3',
          coordinate: [1.76, 42.26],
          distanceKm: 14,
          elevationM: 1_500,
          routeId: 'route-1',
          slopePercent: -6.2,
        }}
      />,
    );

    expect(mocks.setSourceData).not.toHaveBeenCalled();
    act(() => mocks.handlers.get('load')?.());

    expect(mocks.setSourceData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        features: [
          expect.objectContaining({
            geometry: { type: 'Point', coordinates: [1.76, 42.26] },
          }),
        ],
      }),
    );
  });

  it('renders a translucent in-map legend with color dots', () => {
    render(<EventTrackMap {...props} />);

    expect(screen.getByTestId('event-track-map-legend')).toBeDefined();
    expect(screen.getByTestId('event-track-map-legend').className).toContain('left-1/2');
    expect(screen.getByTestId('event-track-map-legend').className).toContain('w-max');
    expect(screen.getByTestId('event-track-map-legend').className).toContain(
      'justify-center',
    );
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
    const legendLabel = screen.getByText('Marató');
    expect(legendLabel.className).toContain('truncate');
    expect(legendLabel.getAttribute('title')).toBe('Marató');
    expect(legendLabel.parentElement?.className).toContain('max-w-full');
    expect(legendLabel.parentElement?.className).not.toContain('max-w-60');
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

  it('shows a non-interactive mobile preview CTA and reuses the map fullscreen', () => {
    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());

    const anchor = screen.getByTestId('event-track-map-anchor');
    const attribution = screen
      .getByTestId('event-track-map')
      .querySelector<HTMLElement>('.maplibregl-ctrl-attrib');
    const mapRoot = screen.getByTestId('event-track-map').parentElement;
    const previewButton = screen.getByTestId('event-track-map-preview-toggle');

    expect(anchor.className).toContain('h-[336px]');
    expect(anchor.className).toContain('sm:h-[480px]');
    expect(attribution?.hidden).toBe(true);
    expect(mapRoot?.getAttribute('data-map-preview')).toBe('true');
    expect(previewButton.textContent).toContain('openRouteFullscreen');
    expect(screen.getByTestId('event-track-map-legend').className).toContain(
      'hidden',
    );
    expect(screen.getByTestId('event-track-map-legend').className).toContain(
      'sm:flex',
    );
    expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);
    expect(mocks.fitBounds).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ padding: 48 }),
    );

    fireEvent.click(previewButton);

    expect(mapRoot?.getAttribute('data-map-preview')).toBeNull();
    expect(mapRoot?.getAttribute('data-map-fullscreen')).toBe('true');
    expect(attribution?.hidden).toBe(false);
    expect(screen.queryByTestId('event-track-map-preview-toggle')).toBeNull();
    expect(mocks.mapConstructor).toHaveBeenCalledTimes(1);
    expect(mocks.track).toHaveBeenCalledWith(
      'event_track_map_fullscreen_opened',
      expect.objectContaining({
        event_id: 'event-1',
        event_slug: 'pedraforca-xtrail',
        route_count: 1,
        race_count: 1,
        feature_flag_variant: 'control',
      }),
    );
    expect(mocks.track).toHaveBeenCalledWith(
      'event_track_map_preview_engaged',
      expect.objectContaining({ engagement_type: 'open_map' }),
    );
  });

  it('shows the elevation profile at the bottom and moves the legend in fullscreen', () => {
    render(
      <EventTrackMap
        {...props}
        fullscreenProfile={
          <div data-testid="fullscreen-elevation-profile">Profile</div>
        }
      />,
    );

    expect(
      screen.queryByTestId('event-track-map-fullscreen-profile'),
    ).toBeNull();

    fireEvent.click(screen.getByTestId('event-track-map-fullscreen-toggle'));

    const profilePanel = screen.getByTestId(
      'event-track-map-fullscreen-profile',
    );
    const legend = screen.getByTestId('event-track-map-legend');
    expect(profilePanel.className).toContain('inset-x-0');
    expect(profilePanel.className).toContain('bottom-0');
    expect(profilePanel.className).toContain('w-full');
    expect(profilePanel.className).toContain('max-w-none');
    expect(screen.getByTestId('fullscreen-elevation-profile')).toBeDefined();
    expect(legend.dataset.fullscreen).toBe('true');
    expect(legend.className).toContain('top-3');
    expect(legend.className).not.toContain('bottom-3');

    fireEvent.click(screen.getByTestId('event-track-map-fullscreen-toggle'));
    expect(
      screen.queryByTestId('event-track-map-fullscreen-profile'),
    ).toBeNull();
  });

  it('preserves 3D settings and cleans up a fullscreen portal on unmount', () => {
    const view = render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    const terrainButton = screen.getByTestId('event-track-map-terrain-toggle');
    fireEvent.click(terrainButton);
    finishTerrainLoading();
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
    expect(mocks.addSource).toHaveBeenCalledTimes(2);

    fireEvent.click(button);

    expect(mocks.addSource).toHaveBeenCalledTimes(5);
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
      'osm',
    );
    expect(mocks.addLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'event-terrain-hillshade',
        type: 'hillshade',
      }),
      'osm',
    );
    expect(mocks.setTerrain).toHaveBeenLastCalledWith({
      source: 'event-terrain',
      exaggeration: 1,
    });
    expect(mocks.setLayoutProperty).not.toHaveBeenCalledWith(
      'osm',
      'visibility',
      'none',
    );
    expect(mocks.fitBounds).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ bearing: -20, duration: 700, pitch: 60 }),
    );
    expect(button.disabled).toBe(true);
    expect(screen.getByTestId('event-track-map-terrain-status').textContent).toContain(
      'terrainLoading',
    );
    expect(mocks.track).not.toHaveBeenCalledWith(
      'event_track_map_terrain_toggled',
      expect.objectContaining({ mode: '3d' }),
    );

    act(() => {
      mocks.handlers.get('sourcedata')?.({
        sourceId: 'event-terrain',
        isSourceLoaded: true,
      });
      mocks.handlers.get('sourcedata')?.({
        sourceId: 'event-terrain-hillshade',
        isSourceLoaded: true,
      });
      mocks.handlers.get('idle')?.();
    });
    expect(button.disabled).toBe(true);
    expect(mocks.setLayoutProperty).not.toHaveBeenCalledWith(
      'osm',
      'visibility',
      'none',
    );

    act(() =>
      mocks.handlers.get('sourcedata')?.({
        sourceId: 'event-orthophoto',
        isSourceLoaded: true,
      }),
    );
    expect(button.disabled).toBe(true);
    expect(mocks.setLayoutProperty).not.toHaveBeenCalledWith(
      'osm',
      'visibility',
      'none',
    );

    act(() => mocks.handlers.get('idle')?.());

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

    expect(mocks.addSource).toHaveBeenCalledTimes(5);
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

  it('warns about a slow load, cancels cleanly, and ignores stale readiness', () => {
    vi.useFakeTimers();
    try {
      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      fireEvent.click(screen.getByTestId('event-track-map-terrain-toggle'));

      act(() => {
        for (const sourceId of [
          'event-terrain',
          'event-terrain-hillshade',
          'event-orthophoto',
        ]) {
          mocks.handlers.get('sourcedata')?.({
            sourceId,
            isSourceLoaded: true,
          });
        }
        vi.advanceTimersByTime(8_000);
      });

      const status = screen.getByTestId('event-track-map-terrain-status');
      expect(status.textContent).toContain('terrainLoadingSlow');
      expect(
        (screen.getByTestId('event-track-map-rotation-button') as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: 'terrainCancel' }));

      expect(screen.queryByTestId('event-track-map-terrain-status')).toBeNull();
      expect(
        screen
          .getByTestId('event-track-map')
          .parentElement?.getAttribute('data-terrain-status'),
      ).toBe('2d');
      expect(mocks.track).toHaveBeenCalledWith(
        'event_track_map_terrain_load_finished',
        expect.objectContaining({ outcome: 'cancelled' }),
      );

      act(() => mocks.handlers.get('idle')?.());
      expect(mocks.track).not.toHaveBeenCalledWith(
        'event_track_map_terrain_toggled',
        expect.objectContaining({ mode: '3d' }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('times out after 20 seconds and retries without recreating sources', () => {
    vi.useFakeTimers();
    try {
      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      fireEvent.click(screen.getByTestId('event-track-map-terrain-toggle'));

      act(() => vi.advanceTimersByTime(20_000));

      expect(
        screen.getByTestId('event-track-map-terrain-status').textContent,
      ).toContain('terrainLoadFailed');
      expect(mocks.track).toHaveBeenCalledWith(
        'event_track_map_terrain_load_finished',
        expect.objectContaining({ outcome: 'timeout' }),
      );
      expect(mocks.addSource).toHaveBeenCalledTimes(5);

      fireEvent.click(
        screen
          .getByTestId('event-track-map-terrain-status')
          .querySelector('button')!,
      );
      expect(mocks.addSource).toHaveBeenCalledTimes(5);
      expect(mocks.setSourceUrl).toHaveBeenCalledTimes(2);
      expect(mocks.setSourceUrl).toHaveBeenCalledWith(
        'https://tiles.mapterhorn.com/tilejson.json',
      );
      expect(mocks.setSourceTiles).toHaveBeenCalledOnce();
      expect(
        screen.getByTestId('event-track-map-terrain-status').textContent,
      ).toContain('terrainLoading');

      finishTerrainLoading();

      expect(screen.queryByTestId('event-track-map-terrain-status')).toBeNull();
      expect(mocks.track).toHaveBeenCalledWith(
        'event_track_map_terrain_load_finished',
        expect.objectContaining({ outcome: 'ready' }),
      );
      expect(mocks.track).toHaveBeenCalledWith(
        'event_track_map_terrain_toggled',
        expect.objectContaining({ mode: '3d' }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides terrain settings in production and toggles directly back to 2D', () => {
    vi.stubEnv('NODE_ENV', 'production');
    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    const button = screen.getByTestId('event-track-map-terrain-toggle');

    fireEvent.click(button);
    finishTerrainLoading();

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
      finishTerrainLoading();
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
    expect(button.title).toBe('terrainLoadFailed');
    expect(screen.getByTestId('event-track-map-terrain-status').textContent).toContain(
      'terrainLoadFailed',
    );
    expect(mocks.setTerrain).toHaveBeenLastCalledWith(null);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(screen.getByTestId('event-track-map')).toBeDefined();
    expect(mocks.track).toHaveBeenCalledWith(
      'event_track_map_terrain_load_finished',
      expect.objectContaining({ outcome: 'error' }),
    );

    fireEvent.click(
      screen
        .getByTestId('event-track-map-terrain-status')
        .querySelector('button')!,
    );
    expect(mocks.addSource).toHaveBeenCalledTimes(5);
    expect(mocks.setSourceUrl).toHaveBeenCalledTimes(2);
    expect(mocks.setSourceTiles).toHaveBeenCalledOnce();
    finishTerrainLoading();
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not activate terrain from a pending idle event after unmount', () => {
    const view = render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    fireEvent.click(screen.getByTestId('event-track-map-terrain-toggle'));
    act(() => {
      for (const sourceId of [
        'event-terrain',
        'event-terrain-hillshade',
        'event-orthophoto',
      ]) {
        mocks.handlers.get('sourcedata')?.({
          sourceId,
          isSourceLoaded: true,
        });
      }
    });
    mocks.track.mockClear();

    view.unmount();
    act(() => mocks.handlers.get('idle')?.());

    expect(mocks.track).not.toHaveBeenCalledWith(
      'event_track_map_terrain_toggled',
      expect.objectContaining({ mode: '3d' }),
    );
  });

  it('keeps terrain active when a tile fails after DEM data has loaded', () => {
    render(<EventTrackMap {...props} />);
    act(() => mocks.handlers.get('load')?.());
    const button = screen.getByTestId(
      'event-track-map-terrain-toggle',
    ) as HTMLButtonElement;
    fireEvent.click(button);
    finishTerrainLoading();
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
    finishTerrainLoading();
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
    expect(mocks.track).toHaveBeenCalledTimes(2);
    expect(mocks.track).toHaveBeenCalledWith(
      'event_track_map_preview_engaged',
      expect.objectContaining({ engagement_type: 'rotate' }),
    );
  });

  it('automatically dismisses the rotation hint and shows it only once', () => {
    vi.useFakeTimers();
    try {
      render(<EventTrackMap {...props} />);
      act(() => mocks.handlers.get('load')?.());
      const button = screen.getByTestId('event-track-map-terrain-toggle');

      fireEvent.click(button);
      finishTerrainLoading();
      expect(screen.getByTestId('event-track-map-rotation-hint')).toBeDefined();

      act(() => vi.advanceTimersByTime(6000));
      expect(screen.queryByTestId('event-track-map-rotation-hint')).toBeNull();

      fireEvent.click(button);
      finishTerrainLoading();
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
