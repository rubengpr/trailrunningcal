'use client';

import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import type {
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
} from 'geojson';
import { Flag, Play } from 'lucide-react';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { OSM_STANDARD_STYLE } from '@/lib/maps/style';
import { buildTrackEndpointGroups } from '@/lib/race-tracks/routes';
import type {
  ElevationProfileCursorPoint,
  TrackEndpointGroup,
  TrackEndpointKind,
  TrackRoute,
} from '@/types/race-track.types';

const TERRAIN_TILEJSON_URL = 'https://tiles.mapterhorn.com/tilejson.json';
const TERRAIN_SOURCE_ID = 'event-terrain';
const HILLSHADE_SOURCE_ID = 'event-terrain-hillshade';
const HILLSHADE_LAYER_ID = 'event-terrain-hillshade';
const ORTHOPHOTO_SOURCE_ID = 'event-orthophoto';
const ORTHOPHOTO_LAYER_ID = 'event-orthophoto';
const DIRECTION_ARROW_IMAGE_ID = 'event-track-direction-arrow';
const PROFILE_POINT_SOURCE_ID = 'event-track-profile-point';
const PROFILE_POINT_LAYER_ID = 'event-track-profile-point';
const ORTHOPHOTO_TILE_URL =
  'https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/{z}/{x}/{y}.png';
const DEFAULT_HILLSHADE_INTENSITY = 0.18;
const DEFAULT_TERRAIN_EXAGGERATION = 1;
const DEFAULT_TERRAIN_PITCH = 60;
const MAX_TERRAIN_EXAGGERATION = 2;
const MAX_TERRAIN_PITCH = 70;
const MIN_TERRAIN_EXAGGERATION = 0.5;
const MIN_TERRAIN_PITCH = 30;
const MAX_HILLSHADE_INTENSITY = 1;
const MIN_HILLSHADE_INTENSITY = 0;
const TERRAIN_SLOW_LOADING_DELAY_MS = 8_000;
const TERRAIN_LOADING_TIMEOUT_MS = 20_000;

export type TerrainStatus = '2d' | 'loading' | 'slow' | '3d' | 'failed';

type TerrainLoadOutcome = 'ready' | 'cancelled' | 'timeout' | 'error';

interface TerrainSettings {
  exaggeration: number;
  hillshadeIntensity: number;
  pitch: number;
}

interface EventTrackMapOptions {
  activePoint: ElevationProfileCursorPoint | null;
  eventId: string;
  eventSlug: string;
  finishLabel: string;
  routes: TrackRoute[];
  startLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
}

type TerrainMapError = maplibregl.ErrorEvent & { sourceId?: string };
type TerrainSourceDataEvent = maplibregl.MapSourceDataEvent & {
  isSourceLoaded?: boolean;
  sourceId?: string;
};

const TERRAIN_LOADING_SOURCE_IDS = new Set([
  TERRAIN_SOURCE_ID,
  HILLSHADE_SOURCE_ID,
  ORTHOPHOTO_SOURCE_ID,
]);

interface EndpointLabels {
  finish: string;
  start: string;
}

interface EndpointMarkerEntry {
  element: HTMLButtonElement;
  hidePopup: () => void;
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
  root: Root;
  showPopup: () => void;
}

function distanceToSegment(
  x: number,
  y: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const position = lengthSquared === 0
    ? 0
    : clamp(
        ((x - startX) * deltaX + (y - startY) * deltaY) / lengthSquared,
        0,
        1,
      );
  const nearestX = startX + position * deltaX;
  const nearestY = startY + position * deltaY;
  return Math.hypot(x - nearestX, y - nearestY);
}

function createDirectionArrowImage(): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const width = 24;
  const height = 24;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const distance = Math.min(
        distanceToSegment(x, y, 7, 5, 17, 12),
        distanceToSegment(x, y, 17, 12, 7, 19),
      );
      const offset = (y * width + x) * 4;

      if (distance <= 3.4) {
        data[offset] = distance <= 1.65 ? 255 : 41;
        data[offset + 1] = distance <= 1.65 ? 255 : 37;
        data[offset + 2] = distance <= 1.65 ? 255 : 36;
        data[offset + 3] = distance <= 1.65 ? 245 : 155;
      }
    }
  }

  return { width, height, data };
}

function getEndpointText(
  kinds: TrackEndpointKind[],
  labels: EndpointLabels,
): string {
  const values = kinds.map((kind) =>
    kind === 'start' ? labels.start : labels.finish,
  );
  return values.join(' · ');
}

function createEndpointMarkerElement(
  endpoint: TrackEndpointGroup,
  labels: EndpointLabels,
): { element: HTMLButtonElement; root: Root } {
  const element = document.createElement('button');
  const endpointType =
    endpoint.kinds.length === 2 ? 'both' : endpoint.kinds[0]!;
  const title = `${getEndpointText(endpoint.kinds, labels)}: ${endpoint.raceNames.join(' · ')}`;
  element.type = 'button';
  element.className = `event-track-map-endpoint-marker event-track-map-endpoint-${endpointType}`;
  element.dataset.trackEndpointMarker = endpoint.id;
  element.title = title;
  element.setAttribute('aria-label', title);
  element.style.setProperty('--event-track-endpoint-color', endpoint.color);
  const root = createRoot(element);
  root.render(
    createElement(
      'span',
      { className: 'event-track-map-endpoint-icons', 'aria-hidden': true },
      endpoint.kinds.map((kind) =>
        createElement(kind === 'start' ? Play : Flag, {
          key: kind,
          className: 'event-track-map-endpoint-icon',
          fill: kind === 'start' ? 'currentColor' : 'none',
          strokeWidth: kind === 'finish' ? 3 : 2.25,
        }),
      ),
    ),
  );
  return { element, root };
}

function createEndpointPopupContent(
  endpoint: TrackEndpointGroup,
  labels: EndpointLabels,
): HTMLDivElement {
  const container = document.createElement('div');
  const title = document.createElement('p');
  const races = document.createElement('ul');
  container.className = 'event-track-map-endpoint-popup';
  title.className = 'event-track-map-endpoint-popup-title';
  races.className = 'event-track-map-endpoint-popup-races';
  title.textContent = getEndpointText(endpoint.kinds, labels);
  for (const race of endpoint.races) {
    const item = document.createElement('li');
    const dot = document.createElement('span');
    const name = document.createElement('span');
    item.className = 'event-track-map-endpoint-popup-race';
    dot.className = 'event-track-map-endpoint-popup-dot';
    dot.style.backgroundColor = race.color;
    dot.setAttribute('aria-hidden', 'true');
    name.textContent = race.name;
    item.append(dot, name);
    races.append(item);
  }
  container.append(title, races);
  return container;
}

function collapseAttribution(container: HTMLElement): void {
  container
    .querySelector('.maplibregl-ctrl-attrib')
    ?.classList.remove('maplibregl-compact-show');
}

function extendBounds(
  bounds: maplibregl.LngLatBounds,
  geometry: LineString | MultiLineString,
): void {
  const segments =
    geometry.type === 'LineString'
      ? [geometry.coordinates]
      : geometry.coordinates;

  for (const segment of segments) {
    for (const coordinate of segment) {
      bounds.extend([coordinate[0]!, coordinate[1]!]);
    }
  }
}

function fitRouteBounds(
  map: maplibregl.Map,
  bounds: maplibregl.LngLatBounds,
  mode: '2d' | '3d',
  duration: number,
  terrainPitch = DEFAULT_TERRAIN_PITCH,
): void {
  map.fitBounds(bounds, {
    padding: window.matchMedia('(min-width: 640px)').matches ? 48 : 24,
    maxZoom: 15,
    duration,
    linear: true,
    pitch: mode === '3d' ? terrainPitch : 0,
    bearing: mode === '3d' ? -20 : 0,
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function isTerrainError(event: TerrainMapError): boolean {
  const message = event.error.message;
  return (
    event.sourceId === TERRAIN_SOURCE_ID ||
    event.sourceId === HILLSHADE_SOURCE_ID ||
    message.includes(TERRAIN_TILEJSON_URL) ||
    message.includes('tiles.mapterhorn.com') ||
    event.sourceId === ORTHOPHOTO_SOURCE_ID ||
    message.includes('geoserveis.icgc.cat') ||
    message.includes(TERRAIN_SOURCE_ID) ||
    message.includes(HILLSHADE_SOURCE_ID) ||
    message.includes(ORTHOPHOTO_SOURCE_ID)
  );
}

export function useEventTrackMap({
  activePoint,
  eventId,
  eventSlug,
  finishLabel,
  routes,
  startLabel,
  zoomInLabel,
  zoomOutLabel,
}: EventTrackMapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const activePointRef = useRef(activePoint);
  const resizeMapRef = useRef<() => void>(() => undefined);
  const rotateMapRef = useRef<(direction: -1 | 1) => void>(() => undefined);
  const updateTerrainSettingsRef = useRef<
    (settings: Partial<TerrainSettings>) => void
  >(() => undefined);
  const cancelTerrainRef = useRef<() => void>(() => undefined);
  const disableTerrainRef = useRef<() => void>(() => undefined);
  const requestTerrainRef = useRef<() => void>(() => undefined);
  const [hasError, setHasError] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [terrainStatus, setTerrainStatus] = useState<TerrainStatus>('2d');
  const [hillshadeIntensity, setHillshadeIntensityState] = useState(
    DEFAULT_HILLSHADE_INTENSITY,
  );
  const [showRotationHint, setShowRotationHint] = useState(false);
  const [terrainExaggeration, setTerrainExaggerationState] = useState(
    DEFAULT_TERRAIN_EXAGGERATION,
  );
  const [terrainPitch, setTerrainPitchState] = useState(DEFAULT_TERRAIN_PITCH);

  activePointRef.current = activePoint;

  const updateProfilePoint = useCallback(
    (
      map: maplibregl.Map,
      point: ElevationProfileCursorPoint | null,
    ): void => {
      const source = map.getSource(PROFILE_POINT_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!source) return;

      const data: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: point
          ? [
              {
                type: 'Feature',
                properties: { color: point.color },
                geometry: { type: 'Point', coordinates: point.coordinate },
              },
            ]
          : [],
      };
      source.setData(data);
    },
    [],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (map) updateProfilePoint(map, activePoint);
  }, [activePoint, updateProfilePoint]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: maplibregl.Map | null = null;
    let errorTimeoutId: number | null = null;
    let rotationHintTimeoutId: number | null = null;
    let terrainSlowTimeoutId: number | null = null;
    let terrainLoadingTimeoutId: number | null = null;
    const endpointMarkers: EndpointMarkerEntry[] = [];
    const loadedTerrainSources = new Set<string>();
    let disposed = false;
    let activeTerrainAttemptId = 0;
    let interactionTracked = false;
    let pendingTerrainIdleHandler: (() => void) | null = null;
    let rotationTargetBearing: number | null = null;
    let routeBounds: maplibregl.LngLatBounds | null = null;
    let terrainInitialized = false;
    let currentTerrainStatus: TerrainStatus = '2d';
    let terrainLoadStartedAt: number | null = null;
    let rotationHintShown = false;
    let settingsAnimationFrameId: number | null = null;
    let currentHillshadeIntensity = DEFAULT_HILLSHADE_INTENSITY;
    let currentTerrainExaggeration = DEFAULT_TERRAIN_EXAGGERATION;
    let currentTerrainPitch = DEFAULT_TERRAIN_PITCH;
    let pendingTerrainSettings: Partial<TerrainSettings> = {};
    const raceCount = new Set(routes.flatMap((route) => route.raceIds)).size;

    const handleMapError = () => {
      if (disposed) return;

      try {
        map?.remove();
      } catch {
        // The map is already unusable, so continue to the fallback UI.
      }
      map = null;
      errorTimeoutId ??= window.setTimeout(() => {
        if (!disposed) setHasError(true);
      }, 0);
    };

    const dismissRotationHint = () => {
      if (rotationHintTimeoutId !== null) {
        window.clearTimeout(rotationHintTimeoutId);
        rotationHintTimeoutId = null;
      }
      setShowRotationHint(false);
    };

    const updateTerrainStatus = (status: TerrainStatus) => {
      currentTerrainStatus = status;
      setTerrainStatus(status);
    };

    const clearTerrainLoadTimers = () => {
      if (terrainSlowTimeoutId !== null) {
        window.clearTimeout(terrainSlowTimeoutId);
        terrainSlowTimeoutId = null;
      }
      if (terrainLoadingTimeoutId !== null) {
        window.clearTimeout(terrainLoadingTimeoutId);
        terrainLoadingTimeoutId = null;
      }
    };

    const clearPendingTerrainIdle = () => {
      if (!map || !pendingTerrainIdleHandler) return;
      map.off('idle', pendingTerrainIdleHandler);
      pendingTerrainIdleHandler = null;
    };

    const trackTerrainLoadFinished = (outcome: TerrainLoadOutcome) => {
      if (terrainLoadStartedAt === null) return;
      track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_TERRAIN_LOAD_FINISHED, {
        event_id: eventId,
        event_slug: eventSlug,
        outcome,
        duration_ms: Math.max(
          0,
          Math.round(performance.now() - terrainLoadStartedAt),
        ),
      });
      terrainLoadStartedAt = null;
    };

    const restore2D = (duration = 700) => {
      if (!map) return;

      try {
        map.setTerrain(null);
        if (map.getLayer(HILLSHADE_LAYER_ID)) {
          map.setLayoutProperty(HILLSHADE_LAYER_ID, 'visibility', 'none');
        }
        if (map.getLayer(ORTHOPHOTO_LAYER_ID)) {
          map.setLayoutProperty(ORTHOPHOTO_LAYER_ID, 'visibility', 'none');
        }
        if (map.getLayer('osm')) {
          map.setLayoutProperty('osm', 'visibility', 'visible');
        }
        if (routeBounds) fitRouteBounds(map, routeBounds, '2d', duration);
      } catch {
        // The original 2D map remains usable even if terrain cleanup is partial.
      }
      dismissRotationHint();
    };

    const stopTerrainAttempt = (
      outcome: Exclude<TerrainLoadOutcome, 'ready'>,
      nextStatus: '2d' | 'failed',
    ) => {
      if (
        disposed ||
        (currentTerrainStatus !== 'loading' &&
          currentTerrainStatus !== 'slow')
      ) {
        return;
      }
      activeTerrainAttemptId += 1;
      clearTerrainLoadTimers();
      clearPendingTerrainIdle();
      loadedTerrainSources.clear();
      restore2D(0);
      trackTerrainLoadFinished(outcome);
      updateTerrainStatus(nextStatus);
    };

    try {
      map = new maplibregl.Map({
        container,
        style: OSM_STANDARD_STYLE,
        center: [1.7, 42.2],
        zoom: 10,
        locale: {
          'NavigationControl.ZoomIn': zoomInLabel,
          'NavigationControl.ZoomOut': zoomOutLabel,
        },
        attributionControl: false,
      });
      mapRef.current = map;
      resizeMapRef.current = () => map?.resize();
      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: false,
          showZoom: true,
          visualizePitch: false,
        }),
        'top-right',
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'top-right',
      );
      collapseAttribution(container);

      const trackInteraction = (interaction: 'pan' | 'rotate' | 'zoom') => {
        if (interactionTracked) return;
        interactionTracked = true;
        track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_INTERACTED, {
          event_id: eventId,
          event_slug: eventSlug,
          interaction,
          route_count: routes.length,
          race_count: raceCount,
        });
      };

      rotateMapRef.current = (direction) => {
        if (!map) return;
        dismissRotationHint();
        trackInteraction('rotate');
        rotationTargetBearing =
          (rotationTargetBearing ?? map.getBearing()) + direction * 30;
        map.easeTo({ bearing: rotationTargetBearing, duration: 350 });
      };

      updateTerrainSettingsRef.current = (settings) => {
        pendingTerrainSettings = { ...pendingTerrainSettings, ...settings };
        if (settingsAnimationFrameId !== null) return;

        settingsAnimationFrameId = window.requestAnimationFrame(() => {
          settingsAnimationFrameId = null;
          const nextSettings = pendingTerrainSettings;
          pendingTerrainSettings = {};
          if (nextSettings.pitch !== undefined) {
            currentTerrainPitch = nextSettings.pitch;
          }
          if (nextSettings.exaggeration !== undefined) {
            currentTerrainExaggeration = nextSettings.exaggeration;
          }
          if (nextSettings.hillshadeIntensity !== undefined) {
            currentHillshadeIntensity = nextSettings.hillshadeIntensity;
          }
          if (!map?.getTerrain()) return;
          if (nextSettings.exaggeration !== undefined) {
            map.setTerrain({
              source: TERRAIN_SOURCE_ID,
              exaggeration: currentTerrainExaggeration,
            });
          }
          if (nextSettings.pitch !== undefined) {
            map.easeTo({ pitch: currentTerrainPitch, duration: 0 });
          }
          if (
            nextSettings.hillshadeIntensity !== undefined &&
            map.getLayer(HILLSHADE_LAYER_ID)
          ) {
            map.setPaintProperty(
              HILLSHADE_LAYER_ID,
              'hillshade-exaggeration',
              currentHillshadeIntensity,
            );
          }
        });
      };

      map.on('dragstart', (event) => {
        if (event.originalEvent) trackInteraction('pan');
      });
      map.on('zoomstart', (event) => {
        if (event.originalEvent) trackInteraction('zoom');
      });
      map.on('rotatestart', (event) => {
        if (event.originalEvent) {
          rotationTargetBearing = null;
          dismissRotationHint();
          trackInteraction('rotate');
        }
      });
      map.on('rotateend', () => {
        rotationTargetBearing = null;
      });
      map.on('error', (event: TerrainMapError) => {
        if (
          terrainInitialized &&
          (currentTerrainStatus === 'loading' ||
            currentTerrainStatus === 'slow') &&
          isTerrainError(event)
        ) {
          if (event.sourceId) loadedTerrainSources.delete(event.sourceId);
          stopTerrainAttempt('error', 'failed');
        }
      });
      map.on('sourcedata', (event: TerrainSourceDataEvent) => {
        if (!event.sourceId || !TERRAIN_LOADING_SOURCE_IDS.has(event.sourceId)) {
          return;
        }
        if (event.isSourceLoaded) loadedTerrainSources.add(event.sourceId);
        else loadedTerrainSources.delete(event.sourceId);
      });

      map.on('load', () => {
        if (!map) return;

        try {
          collapseAttribution(container);
          const data: FeatureCollection<LineString | MultiLineString> = {
            type: 'FeatureCollection',
            features: routes.map((route, routeIndex) => ({
              type: 'Feature',
              properties: { routeIndex },
              geometry: route.geometry,
            })),
          };
          map.addSource('event-tracks', { type: 'geojson', data });
          map.addSource(PROFILE_POINT_SOURCE_ID, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
          map.addImage(
            DIRECTION_ARROW_IMAGE_ID,
            createDirectionArrowImage(),
            { pixelRatio: 2 },
          );

          const renderRoutes = routes
            .map((route, routeIndex) => ({ route, routeIndex }))
            .sort((left, right) => right.route.lineWidth - left.route.lineWidth);

          renderRoutes.forEach(({ route, routeIndex }) => {
            map!.addLayer({
              id: `event-track-casing-${routeIndex}`,
              type: 'line',
              source: 'event-tracks',
              filter: ['==', ['get', 'routeIndex'], routeIndex],
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': '#ffffff',
                'line-opacity': 0.92,
                'line-width': route.lineWidth + 3,
              },
            });
          });

          for (const lineStyle of ['solid', 'dashed'] as const) {
            renderRoutes.forEach(({ route, routeIndex }) => {
              if (route.lineStyle !== lineStyle) return;

              map!.addLayer({
                id: `event-track-line-${routeIndex}`,
                type: 'line',
                source: 'event-tracks',
                filter: ['==', ['get', 'routeIndex'], routeIndex],
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-color': route.color,
                  'line-opacity': 0.96,
                  'line-width': route.lineWidth,
                  ...(lineStyle === 'dashed'
                    ? { 'line-dasharray': [1.5, 1.5] }
                    : {}),
                },
              });
            });
          }

          renderRoutes.forEach(({ routeIndex }) => {
            map!.addLayer({
              id: `event-track-direction-${routeIndex}`,
              type: 'symbol',
              source: 'event-tracks',
              filter: ['==', ['get', 'routeIndex'], routeIndex],
              layout: {
                'symbol-placement': 'line',
                'symbol-spacing': 140,
                'icon-image': DIRECTION_ARROW_IMAGE_ID,
                'icon-size': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  8,
                  0.8,
                  14,
                  1,
                  17,
                  1.15,
                ],
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-keep-upright': false,
                'icon-pitch-alignment': 'map',
                'icon-rotation-alignment': 'map',
              },
              paint: { 'icon-opacity': 0.92 },
            });
          });

          map.addLayer({
            id: PROFILE_POINT_LAYER_ID,
            type: 'circle',
            source: PROFILE_POINT_SOURCE_ID,
            paint: {
              'circle-color': ['get', 'color'],
              'circle-radius': 6,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 3,
            },
          });
          updateProfilePoint(map, activePointRef.current);

          const endpointLabels: EndpointLabels = {
            finish: finishLabel,
            start: startLabel,
          };
          for (const endpoint of buildTrackEndpointGroups(routes)) {
            const { element, root } = createEndpointMarkerElement(
              endpoint,
              endpointLabels,
            );
            const popup = new maplibregl.Popup({
              anchor: 'bottom',
              closeButton: false,
              maxWidth: '260px',
              offset: 14,
            })
              .setLngLat(endpoint.coordinate)
              .setDOMContent(createEndpointPopupContent(endpoint, endpointLabels));
            const marker = new maplibregl.Marker({
              element,
              anchor: 'center',
              opacityWhenCovered: '0.35',
            })
              .setLngLat(endpoint.coordinate)
              .setPopup(popup)
              .addTo(map);
            const showPopup = () => popup.addTo(map!);
            const hidePopup = () => popup.remove();
            element.addEventListener('mouseenter', showPopup);
            element.addEventListener('mouseleave', hidePopup);
            element.addEventListener('focus', showPopup);
            element.addEventListener('blur', hidePopup);
            endpointMarkers.push({
              element,
              hidePopup,
              marker,
              popup,
              root,
              showPopup,
            });
          }

          routeBounds = new maplibregl.LngLatBounds();
          for (const route of routes) extendBounds(routeBounds, route.geometry);
          fitRouteBounds(map, routeBounds, '2d', 0);

          const initializeTerrain = (): boolean => {
            if (!map) return false;
            try {
              const terrainSource = map.getSource(TERRAIN_SOURCE_ID);
              if (terrainSource) {
                (terrainSource as maplibregl.RasterDEMTileSource).setUrl(
                  TERRAIN_TILEJSON_URL,
                );
              } else {
                map.addSource(TERRAIN_SOURCE_ID, {
                  type: 'raster-dem',
                  url: TERRAIN_TILEJSON_URL,
                  tileSize: 512,
                  encoding: 'terrarium',
                  maxzoom: 17,
                });
              }
              const hillshadeSource = map.getSource(HILLSHADE_SOURCE_ID);
              if (hillshadeSource) {
                (hillshadeSource as maplibregl.RasterDEMTileSource).setUrl(
                  TERRAIN_TILEJSON_URL,
                );
              } else {
                map.addSource(HILLSHADE_SOURCE_ID, {
                  type: 'raster-dem',
                  url: TERRAIN_TILEJSON_URL,
                  tileSize: 512,
                  encoding: 'terrarium',
                  maxzoom: 17,
                });
              }
              const orthophotoSource = map.getSource(ORTHOPHOTO_SOURCE_ID);
              if (orthophotoSource) {
                (orthophotoSource as maplibregl.RasterTileSource).setTiles([
                  ORTHOPHOTO_TILE_URL,
                ]);
              } else {
                map.addSource(ORTHOPHOTO_SOURCE_ID, {
                  type: 'raster',
                  tiles: [ORTHOPHOTO_TILE_URL],
                  tileSize: 256,
                  attribution: '© ICGC',
                  maxzoom: 20,
                });
              }
              if (!map.getLayer(ORTHOPHOTO_LAYER_ID)) {
                map.addLayer(
                  {
                    id: ORTHOPHOTO_LAYER_ID,
                    type: 'raster',
                    source: ORTHOPHOTO_SOURCE_ID,
                    paint: { 'raster-opacity': 1 },
                  },
                  'osm',
                );
              } else {
                map.setLayoutProperty(
                  ORTHOPHOTO_LAYER_ID,
                  'visibility',
                  'visible',
                );
              }
              if (!map.getLayer(HILLSHADE_LAYER_ID)) {
                map.addLayer(
                  {
                    id: HILLSHADE_LAYER_ID,
                    type: 'hillshade',
                    source: HILLSHADE_SOURCE_ID,
                    paint: {
                      'hillshade-exaggeration': currentHillshadeIntensity,
                      'hillshade-shadow-color': 'rgba(34, 29, 20, 0.3)',
                      'hillshade-highlight-color': 'rgba(255, 255, 255, 0.2)',
                      'hillshade-accent-color': 'rgba(91, 77, 52, 0.15)',
                    },
                  },
                  'osm',
                );
              } else {
                map.setLayoutProperty(
                  HILLSHADE_LAYER_ID,
                  'visibility',
                  'visible',
                );
              }

              terrainInitialized = true;
              map.setTerrain({
                source: TERRAIN_SOURCE_ID,
                exaggeration: currentTerrainExaggeration,
              });
              return true;
            } catch {
              stopTerrainAttempt('error', 'failed');
              return false;
            }
          };

          const commitTerrain = (attemptId: number) => {
            pendingTerrainIdleHandler = null;
            if (
              !map ||
              !routeBounds ||
              attemptId !== activeTerrainAttemptId ||
              (currentTerrainStatus !== 'loading' &&
                currentTerrainStatus !== 'slow')
            ) {
              return;
            }

            try {
              clearTerrainLoadTimers();
              map.setLayoutProperty('osm', 'visibility', 'none');
              fitRouteBounds(map, routeBounds, '3d', 700, currentTerrainPitch);
              updateTerrainStatus('3d');
              if (!rotationHintShown) {
                rotationHintShown = true;
                setShowRotationHint(true);
                rotationHintTimeoutId = window.setTimeout(() => {
                  if (!disposed) dismissRotationHint();
                }, 6000);
              }
              trackTerrainLoadFinished('ready');
              track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_TERRAIN_TOGGLED, {
                event_id: eventId,
                event_slug: eventSlug,
                mode: '3d',
              });
            } catch {
              stopTerrainAttempt('error', 'failed');
            }
          };

          const scheduleTerrainCommitIfReady = () => {
            if (
              !map ||
              pendingTerrainIdleHandler ||
              (currentTerrainStatus !== 'loading' &&
                currentTerrainStatus !== 'slow') ||
              ![...TERRAIN_LOADING_SOURCE_IDS].every((sourceId) =>
                loadedTerrainSources.has(sourceId),
              )
            ) {
              return;
            }
            const attemptId = activeTerrainAttemptId;
            pendingTerrainIdleHandler = () => commitTerrain(attemptId);
            map.once('idle', pendingTerrainIdleHandler);
          };

          map.on('sourcedata', scheduleTerrainCommitIfReady);

          requestTerrainRef.current = () => {
            if (
              !map ||
              !routeBounds ||
              currentTerrainStatus === 'loading' ||
              currentTerrainStatus === 'slow' ||
              currentTerrainStatus === '3d'
            ) {
              return;
            }

            const attemptId = ++activeTerrainAttemptId;
            clearPendingTerrainIdle();
            clearTerrainLoadTimers();
            loadedTerrainSources.clear();
            terrainLoadStartedAt = performance.now();
            updateTerrainStatus('loading');
            if (!initializeTerrain()) return;
            scheduleTerrainCommitIfReady();

            terrainSlowTimeoutId = window.setTimeout(() => {
              if (
                !disposed &&
                attemptId === activeTerrainAttemptId &&
                currentTerrainStatus === 'loading'
              ) {
                updateTerrainStatus('slow');
              }
            }, TERRAIN_SLOW_LOADING_DELAY_MS);
            terrainLoadingTimeoutId = window.setTimeout(() => {
              if (attemptId === activeTerrainAttemptId) {
                stopTerrainAttempt('timeout', 'failed');
              }
            }, TERRAIN_LOADING_TIMEOUT_MS);
          };

          cancelTerrainRef.current = () => {
            stopTerrainAttempt('cancelled', '2d');
          };

          disableTerrainRef.current = () => {
            if (currentTerrainStatus !== '3d') return;
            restore2D();
            updateTerrainStatus('2d');
            track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_TERRAIN_TOGGLED, {
              event_id: eventId,
              event_slug: eventSlug,
              mode: '2d',
            });
          };
          setIsMapReady(true);

          track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_VIEWED, {
            event_id: eventId,
            event_slug: eventSlug,
            route_count: routes.length,
            race_count: raceCount,
          });
        } catch {
          handleMapError();
        }
      });
    } catch {
      handleMapError();
    }

    return () => {
      disposed = true;
      activeTerrainAttemptId += 1;
      clearTerrainLoadTimers();
      clearPendingTerrainIdle();
      cancelTerrainRef.current = () => undefined;
      disableTerrainRef.current = () => undefined;
      requestTerrainRef.current = () => undefined;
      rotateMapRef.current = () => undefined;
      resizeMapRef.current = () => undefined;
      updateTerrainSettingsRef.current = () => undefined;
      mapRef.current = null;
      if (settingsAnimationFrameId !== null) {
        window.cancelAnimationFrame(settingsAnimationFrameId);
      }
      if (errorTimeoutId !== null) window.clearTimeout(errorTimeoutId);
      if (rotationHintTimeoutId !== null) {
        window.clearTimeout(rotationHintTimeoutId);
      }
      endpointMarkers.forEach(
        ({ element, hidePopup, marker, popup, root, showPopup }) => {
          element.removeEventListener('mouseenter', showPopup);
          element.removeEventListener('mouseleave', hidePopup);
          element.removeEventListener('focus', showPopup);
          element.removeEventListener('blur', hidePopup);
          popup.remove();
          marker.remove();
          window.setTimeout(() => root.unmount(), 0);
        },
      );
      map?.remove();
    };
  }, [
    eventId,
    eventSlug,
    finishLabel,
    routes,
    startLabel,
    zoomInLabel,
    zoomOutLabel,
    updateProfilePoint,
  ]);

  const resizeMap = useCallback(() => resizeMapRef.current(), []);

  return {
    cancelTerrain: () => cancelTerrainRef.current(),
    containerRef,
    disableTerrain: () => disableTerrainRef.current(),
    hasError,
    hillshadeIntensity,
    isMapReady,
    resetTerrainSettings: () => {
      setHillshadeIntensityState(DEFAULT_HILLSHADE_INTENSITY);
      setTerrainExaggerationState(DEFAULT_TERRAIN_EXAGGERATION);
      setTerrainPitchState(DEFAULT_TERRAIN_PITCH);
      updateTerrainSettingsRef.current({
        exaggeration: DEFAULT_TERRAIN_EXAGGERATION,
        hillshadeIntensity: DEFAULT_HILLSHADE_INTENSITY,
        pitch: DEFAULT_TERRAIN_PITCH,
      });
    },
    resizeMap,
    requestTerrain: () => requestTerrainRef.current(),
    retryTerrain: () => requestTerrainRef.current(),
    rotateMap: (direction: -1 | 1) => rotateMapRef.current(direction),
    setHillshadeIntensity: (value: number) => {
      const nextValue = clamp(
        value,
        MIN_HILLSHADE_INTENSITY,
        MAX_HILLSHADE_INTENSITY,
      );
      setHillshadeIntensityState(nextValue);
      updateTerrainSettingsRef.current({ hillshadeIntensity: nextValue });
    },
    setTerrainExaggeration: (value: number) => {
      const nextValue = clamp(
        value,
        MIN_TERRAIN_EXAGGERATION,
        MAX_TERRAIN_EXAGGERATION,
      );
      setTerrainExaggerationState(nextValue);
      updateTerrainSettingsRef.current({ exaggeration: nextValue });
    },
    setTerrainPitch: (value: number) => {
      const nextValue = clamp(value, MIN_TERRAIN_PITCH, MAX_TERRAIN_PITCH);
      setTerrainPitchState(nextValue);
      updateTerrainSettingsRef.current({ pitch: nextValue });
    },
    showRotationHint,
    terrainExaggeration,
    terrainPitch,
    terrainStatus,
    terrainSupported: true,
  };
}
