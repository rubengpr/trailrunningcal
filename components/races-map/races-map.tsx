'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Locale } from '@/i18n';
import { formatDateToCatalan, formatDateToSpanish } from '@/lib/date-utils';
import type { MapPageLabels, RaceMapMarker } from '@/types/map.types';

/** OpenStreetMap Standard (raster) — attribution shown via MapLibre AttributionControl. */
const OSM_STANDARD_STYLE: StyleSpecification = {
  version: 8,
  name: 'OpenStreetMap Standard',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 24,
    },
  ],
};
const DEFAULT_CENTER: [number, number] = [2.1734, 41.3851];
const DEFAULT_ZOOM = 7;

/** GeoJSON from codeforgermany/click_that_hood (OpenStreetMap-derived boundaries). */
const SPAIN_CCAA_GEOJSON_URL = '/geo/spain-communities.geojson';
const SPAIN_PROVINCES_GEOJSON_URL = '/geo/spain-provinces.geojson';

/** 16px circle marker; offset is uniform [x, y] so the tip stays centered (not `number`, which skews corners). */
const RACE_MARKER_RADIUS_PX = 8;
const POPUP_GAP_FROM_MARKER_PX = 4;
const POPUP_OFFSET_FROM_MARKER: [number, number] = [
  0,
  -(RACE_MARKER_RADIUS_PX + POPUP_GAP_FROM_MARKER_PX),
];

/** Same value passed to MapLibre `Popup` and the body so long titles / date+location can widen the card. */
const POPUP_CONTENT_MAX_WIDTH = 'min(90vw, 480px)';

function createRaceMapMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '16px';
  el.style.height = '16px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = '#000000';
  el.style.border = '2px solid #ffffff';
  el.style.boxSizing = 'border-box';
  el.style.cursor = 'pointer';
  return el;
}

function ChevronLeftIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ArrowUpRightIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  );
}

function addSpainBoundaryLayers(map: maplibregl.Map): void {
  try {
    // Pass URLs so MapLibre loads GeoJSON in the worker (efficient for ~2.6MB total).
    map.addSource('spain-ccaa', {
      type: 'geojson',
      data: SPAIN_CCAA_GEOJSON_URL,
    });
    map.addLayer({
      id: 'spain-ccaa-outline',
      type: 'line',
      source: 'spain-ccaa',
      paint: {
        'line-color': '#334155',
        'line-width': 2,
        'line-opacity': 0.92,
      },
    });

    map.addSource('spain-provinces', {
      type: 'geojson',
      data: SPAIN_PROVINCES_GEOJSON_URL,
    });
    map.addLayer({
      id: 'spain-provinces-outline',
      type: 'line',
      source: 'spain-provinces',
      paint: {
        'line-color': '#94a3b8',
        'line-width': 0.85,
        'line-opacity': 0.88,
      },
    });
  } catch (error) {
    console.error('Failed to add Spain boundary layers:', error);
  }
}

interface MarkerPopupBodyProps {
  marker: RaceMapMarker;
  locale: Locale;
  labels: MapPageLabels;
  /** Which race in the marker stack to show (e.g. when opening from the list). */
  initialRaceIndex?: number;
}

function MarkerPopupBody({
  marker,
  locale,
  labels,
  initialRaceIndex = 0,
}: MarkerPopupBodyProps) {
  const count = marker.races.length;
  const clampedInitial = Math.min(
    Math.max(0, initialRaceIndex),
    Math.max(0, count - 1),
  );
  const [index, setIndex] = useState(clampedInitial);
  const race = marker.races[index];
  if (!race) {
    return null;
  }

  const canGoPrev = index > 0;
  const canGoNext = index < count - 1;

  const handlePrev = (): void => {
    if (!canGoPrev) return;
    setIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = (): void => {
    if (!canGoNext) return;
    setIndex((i) => Math.min(count - 1, i + 1));
  };

  const parsedRaceDate = race.date ? new Date(race.date) : null;
  const hasValidDate =
    parsedRaceDate !== null && !Number.isNaN(parsedRaceDate.getTime());

  const formattedDate = hasValidDate
    ? locale === 'ca'
      ? formatDateToCatalan(race.date)
      : formatDateToSpanish(race.date)
    : '-';

  return (
    <div
      className="race-map-popup-body min-w-0 p-4 text-sm text-gray-900"
      style={{ maxWidth: POPUP_CONTENT_MAX_WIDTH }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <h3 className="min-w-0 wrap-break-word text-base font-bold tracking-tight leading-snug text-gray-900">
          <Link
            href={`/${locale}/carrera/${race.pathSegment}`}
            target="_blank"
            rel="noopener noreferrer"
            title={labels.racePageLink}
            className="cursor-pointer underline-offset-2 hover:underline focus:outline-none"
          >
            {race.name}
          </Link>
        </h3>
        <Link
          href={`/${locale}/carrera/${race.pathSegment}`}
          target="_blank"
          rel="noopener noreferrer"
          title={labels.racePageLink}
          className="inline-flex shrink-0 cursor-pointer rounded-sm p-0.5 text-gray-900 underline-offset-2 transition-colors hover:underline focus:outline-none"
        >
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mb-3 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[10px] sm:text-xs font-medium text-gray-900">
          {formattedDate}
        </span>
        <span className="text-gray-400">·</span>
        <span className="text-[10px] sm:text-xs text-gray-500">
          {marker.city}, {marker.province}
        </span>
      </div>
      <div className="flex w-full min-w-0 gap-2">
        <span className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-900 tabular-nums">
          {race.distanceKm} km
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-900 tabular-nums">
          {race.elevationGainM != null
            ? `${race.elevationGainM} m`
            : labels.notAvailable}
        </span>
      </div>
      {count > 1 ? (
        <div className="mt-3 flex w-full min-w-0 gap-0.5">
          <button
            type="button"
            title={labels.previousRace}
            disabled={!canGoPrev}
            className="flex min-w-0 flex-1 items-center justify-center rounded-md py-1 text-gray-700 transition-colors focus:outline-none enabled:cursor-pointer enabled:hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={handlePrev}
          >
            <ChevronLeftIcon className="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            title={labels.nextRace}
            disabled={!canGoNext}
            className="flex min-w-0 flex-1 items-center justify-center rounded-md py-1 text-gray-700 transition-colors focus:outline-none enabled:cursor-pointer enabled:hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={handleNext}
          >
            <ChevronRightIcon className="h-4 w-4 shrink-0" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface MarkerRegistryEntry {
  mapMarker: RaceMapMarker;
  mlMarker: maplibregl.Marker;
  popup: maplibregl.Popup;
  root: Root;
}

function applyMarkerFocus(
  map: maplibregl.Map,
  registry: MarkerRegistryEntry[],
  target: MarkerRegistryEntry,
  raceIndex: number,
  locale: Locale,
  labels: MapPageLabels,
  popupKey: string,
): () => void {
  for (const entry of registry) {
    const p = entry.mlMarker.getPopup();
    if (p) {
      p.remove();
    }
  }
  target.root.render(
    <MarkerPopupBody
      key={popupKey}
      marker={target.mapMarker}
      locale={locale}
      labels={labels}
      initialRaceIndex={raceIndex}
    />,
  );
  const { longitude, latitude } = target.mapMarker;
  const nextZoom = Math.max(map.getZoom(), 9);
  const openPopup = (): void => {
    target.mlMarker.togglePopup();
  };
  map.once('moveend', openPopup);
  map.flyTo({
    center: [longitude, latitude],
    zoom: nextZoom,
    essential: true,
  });
  return () => {
    map.off('moveend', openPopup);
  };
}

interface RacesMapProps {
  markers: RaceMapMarker[];
  locale: Locale;
  labels: MapPageLabels;
  /** When set, merged after base map container styles (include height utilities as needed). */
  className?: string;
  /** Open the map popup for this race id (use `focusRaceNonce` to repeat the same id). */
  focusRaceId?: string | null;
  focusRaceNonce?: number;
  /**
   * Called when a map pin is clicked (first race at that location). Use with `focusRaceId` / `focusRaceNonce`
   * in the parent so pin clicks use the same fly + popup flow as list selection.
   */
  onMarkerPinClick?: (raceId: string) => void;
}

export default function RacesMap({
  markers,
  locale,
  labels,
  className,
  focusRaceId = null,
  focusRaceNonce = 0,
  onMarkerPinClick,
}: RacesMapProps) {
  const tMap = useTranslations('map');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRegistryRef = useRef<MarkerRegistryEntry[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: OSM_STANDARD_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      locale: {
        'NavigationControl.ZoomIn': tMap('zoomIn'),
        'NavigationControl.ZoomOut': tMap('zoomOut'),
      },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      addSpainBoundaryLayers(map);
    });

    const roots: Root[] = [];
    const registry: MarkerRegistryEntry[] = [];
    const pinClickListeners: Array<{
      el: HTMLElement;
      fn: (e: MouseEvent) => void;
    }> = [];
    markerRegistryRef.current = registry;

    for (const marker of markers) {
      const popupContainer = document.createElement('div');
      const root = createRoot(popupContainer);
      roots.push(root);
      root.render(
        <MarkerPopupBody
          key={`pin-${marker.city}-${marker.province}`}
          marker={marker}
          locale={locale}
          labels={labels}
          initialRaceIndex={0}
        />,
      );

      const popup = new maplibregl.Popup({
        anchor: 'bottom',
        closeButton: false,
        offset: POPUP_OFFSET_FROM_MARKER,
        maxWidth: POPUP_CONTENT_MAX_WIDTH,
      }).setDOMContent(popupContainer);
      popup.on('open', () => {
        requestAnimationFrame(() => {
          popup.setLngLat(popup.getLngLat());
        });
      });

      const mlMarker = new maplibregl.Marker({
        element: createRaceMapMarkerElement(),
        anchor: 'center',
      })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map);

      const entry: MarkerRegistryEntry = {
        mapMarker: marker,
        mlMarker,
        popup,
        root,
      };
      registry.push(entry);

      const markerEl = mlMarker.getElement();
      const handlePinClick = (e: MouseEvent): void => {
        e.stopPropagation();
        const firstRace = marker.races[0];
        if (!firstRace) {
          return;
        }
        if (onMarkerPinClick) {
          onMarkerPinClick(firstRace.id);
        } else {
          applyMarkerFocus(
            map,
            registry,
            entry,
            0,
            locale,
            labels,
            `pin-click-${marker.city}-${marker.province}-${Date.now()}`,
          );
        }
      };
      markerEl.addEventListener('click', handlePinClick);
      pinClickListeners.push({ el: markerEl, fn: handlePinClick });
    }

    return () => {
      for (const { el, fn } of pinClickListeners) {
        el.removeEventListener('click', fn);
      }
      for (const root of roots) {
        root.unmount();
      }
      markerRegistryRef.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, [markers, locale, labels, onMarkerPinClick, tMap]);

  useEffect(() => {
    if (!focusRaceId) return;
    const map = mapRef.current;
    const registry = markerRegistryRef.current;
    if (!map || registry.length === 0) return;

    let target: MarkerRegistryEntry | undefined;
    let raceIndex = -1;
    for (const entry of registry) {
      const idx = entry.mapMarker.races.findIndex((r) => r.id === focusRaceId);
      if (idx >= 0) {
        target = entry;
        raceIndex = idx;
        break;
      }
    }
    if (!target || raceIndex < 0) return;

    return applyMarkerFocus(
      map,
      registry,
      target,
      raceIndex,
      locale,
      labels,
      `${focusRaceId}-${focusRaceNonce}`,
    );
  }, [focusRaceId, focusRaceNonce, markers, locale, labels]);

  const rootClassName =
    className !== undefined
      ? `w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-100 ${className}`
      : 'w-full h-[min(78vh,640px)] rounded-lg border border-gray-200 overflow-hidden bg-gray-100';

  return <div ref={containerRef} className={rootClassName} />;
}
