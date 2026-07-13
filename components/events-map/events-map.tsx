'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Locale } from '@/i18n';
import {
  formatEventDateRange,
  formatEventLocationLabel,
} from '@/lib/events/utils';
import type { EventMapMarker, MapPageLabels } from '@/types/map.types';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';

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
const EVENT_MARKER_RADIUS_PX = 8;
const POPUP_GAP_FROM_MARKER_PX = 4;
const POPUP_OFFSET_FROM_MARKER: [number, number] = [
  0,
  -(EVENT_MARKER_RADIUS_PX + POPUP_GAP_FROM_MARKER_PX),
];

/** Same value passed to MapLibre `Popup` and the body so long titles / date+location can widen the card. */
const POPUP_CONTENT_MAX_WIDTH = 'min(90vw, 480px)';

function createEventMapMarkerElement(): HTMLDivElement {
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
  return <ChevronLeft className={className} strokeWidth={2} />;
}

function ChevronRightIcon({ className }: { className?: string }): ReactElement {
  return <ChevronRight className={className} strokeWidth={2} />;
}

function ArrowUpRightIcon({ className }: { className?: string }): ReactElement {
  return <ArrowUpRight className={className} strokeWidth={2} />;
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
  marker: EventMapMarker;
  locale: Locale;
  labels: MapPageLabels;
  initialEventIndex?: number;
}

function formatDistance(distanceKm: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    maximumFractionDigits: 1,
  }).format(distanceKm);
}

function MarkerPopupBody({
  marker,
  locale,
  labels,
  initialEventIndex = 0,
}: MarkerPopupBodyProps) {
  const count = marker.events.length;
  const clampedInitial = Math.min(
    Math.max(0, initialEventIndex),
    Math.max(0, count - 1),
  );
  const [index, setIndex] = useState(clampedInitial);
  const event = marker.events[index];
  if (!event) {
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

  const formattedDate = formatEventDateRange(
    event.dateRange,
    locale,
    labels.dateTbd,
  );
  const formattedLocation = formatEventLocationLabel(event.location, locale);

  return (
    <div
      className="event-map-popup-body min-w-0 p-4 text-sm text-gray-900"
      style={{ maxWidth: POPUP_CONTENT_MAX_WIDTH }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <h3 className="min-w-0 wrap-break-word text-base font-bold leading-snug text-gray-900">
          <Link
            href={`/${locale}/e/${event.slug}`}
            prefetch={false}
            target="_blank"
            rel="noopener noreferrer"
            title={labels.eventPageLink}
            className="cursor-pointer underline-offset-2 hover:underline focus:outline-none"
          >
            {event.name}
          </Link>
        </h3>
        <Link
          href={`/${locale}/e/${event.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          title={labels.eventPageLink}
          className="inline-flex shrink-0 cursor-pointer rounded-sm p-0.5 text-gray-900 underline-offset-2 transition-colors hover:underline focus:outline-none"
        >
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mb-3 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[10px] sm:text-xs font-medium text-gray-900">
          {formattedDate}
        </span>
        {formattedLocation ? (
          <>
            <span className="text-gray-400">·</span>
            <span className="text-[10px] text-gray-500 sm:text-xs">
              {formattedLocation}
            </span>
          </>
        ) : null}
      </div>
      {event.distances.length > 0 ? (
        <div className="flex w-full min-w-0 flex-wrap gap-1.5">
          {event.distances.map((distance) => (
            <span
              key={distance.id}
              className="inline-flex items-baseline justify-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-900 tabular-nums"
            >
              {formatDistance(distance.distanceKm, locale)} km
            </span>
          ))}
        </div>
      ) : null}
      {count > 1 ? (
        <div className="mt-3 flex w-full min-w-0 gap-0.5">
          <button
            type="button"
            title={labels.previousEvent}
            disabled={!canGoPrev}
            className="flex min-w-0 flex-1 items-center justify-center rounded-md py-1 text-gray-700 transition-colors focus:outline-none enabled:cursor-pointer enabled:hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={handlePrev}
          >
            <ChevronLeftIcon className="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            title={labels.nextEvent}
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
  mapMarker: EventMapMarker;
  mlMarker: maplibregl.Marker;
  popup: maplibregl.Popup;
  root: Root;
}

function applyMarkerFocus(
  map: maplibregl.Map,
  registry: MarkerRegistryEntry[],
  target: MarkerRegistryEntry,
  eventIndex: number,
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
      initialEventIndex={eventIndex}
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

export interface EventsMapProps {
  markers: EventMapMarker[];
  locale: Locale;
  labels: MapPageLabels;
  /** When set, merged after base map container styles (include height utilities as needed). */
  className?: string;
}

export function EventsMap({
  markers,
  locale,
  labels,
  className,
}: EventsMapProps) {
  const tMap = useTranslations('map');
  const containerRef = useRef<HTMLDivElement | null>(null);

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
          initialEventIndex={0}
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
        element: createEventMapMarkerElement(),
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
        const firstEvent = marker.events[0];
        if (!firstEvent) {
          return;
        }
        applyMarkerFocus(
          map,
          registry,
          entry,
          0,
          locale,
          labels,
          `pin-click-${marker.city}-${marker.province}-${Date.now()}`,
        );
      };
      markerEl.addEventListener('click', handlePinClick);
      pinClickListeners.push({ el: markerEl, fn: handlePinClick });
    }

    return () => {
      for (const { el, fn } of pinClickListeners) {
        el.removeEventListener('click', fn);
      }
      for (const root of roots) {
        setTimeout(() => root.unmount(), 0);
      }
      map.remove();
    };
  }, [markers, locale, labels, tMap]);

  const rootClassName =
    className !== undefined
      ? `w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-100 ${className}`
      : 'w-full h-[min(78vh,640px)] rounded-lg border border-gray-200 overflow-hidden bg-gray-100';

  return <div ref={containerRef} className={rootClassName} />;
}
