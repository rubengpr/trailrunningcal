'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pointer,
  Redo,
  Undo,
} from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ErrorMessage,
  TerrainLoadError,
} from '@/components/ui/error-message';
import {
  useEventTrackMap,
  type TerrainStatus,
} from '@/hooks/use-event-track-map';
import { useMapFullscreen } from '@/hooks/use-map-fullscreen';
import { useTerrainSettingsDisclosure } from '@/hooks/use-terrain-settings-disclosure';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import {
  getMapDeviceFormFactor,
  getMapPreviewVariant,
  getRequestedPreviewMode,
  MAP_PREVIEW_FEATURE_FLAG_KEY,
  type MapExperimentContext,
} from '@/lib/maps/experiment';
import { track } from '@/lib/analytics/track';
import { getBrowserTerrainAutoLoadDecision } from '@/lib/maps/terrain-loading';
import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';
import { useMapDeepEngagement, type MapAction } from '@/hooks/use-map-deep-engagement';
import type {
  ElevationProfileCursorPoint,
  TrackRoute,
} from '@/types/race-track.types';

export interface EventTrackMapProps {
  activePoint: ElevationProfileCursorPoint | null;
  eventId: string;
  eventSlug: string;
  routes: TrackRoute[];
  errorTitle: string;
  errorMessage: string;
  fullscreenProfile?: ReactNode;
  onFullscreenChange?: (fullscreen: boolean) => void;
}

const FEATURE_FLAG_TIMEOUT_MS = 3_000;
const PREVIEW_EXPOSURE_DELAY_MS = 2_000;

function MapPlaceholder() {
  return (
    <div
      className="h-[336px] w-full bg-stone-100 sm:h-[480px]"
      data-event-track-map-placeholder
      data-testid="event-track-map-placeholder"
    />
  );
}

interface TrackLegendProps extends Pick<EventTrackMapProps, 'routes'> {
  fullscreen: boolean;
  offsetForHint: boolean;
}

function TrackLegend({
  routes,
  fullscreen,
  offsetForHint,
}: TrackLegendProps) {
  return (
    <ul
      className={`${fullscreen ? 'event-track-map-fullscreen-legend' : 'event-track-map-legend'} absolute z-10 w-max rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-xs leading-4 text-stone-900 shadow-sm backdrop-blur-sm sm:px-4 sm:text-sm ${
        fullscreen
          ? `left-3 flex max-w-[calc(100%-5.5rem)] flex-col items-start justify-start gap-2 text-left sm:max-w-sm ${
              offsetForHint ? 'top-16' : 'top-3'
            }`
          : 'bottom-3 left-1/2 hidden max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center sm:flex'
      }`}
      data-testid="event-track-map-legend"
      data-fullscreen={fullscreen ? 'true' : undefined}
    >
      {routes.map((route) => (
        <li
          key={route.id}
          className="flex min-w-0 max-w-full shrink items-center gap-2"
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/90"
            data-testid={`event-track-map-legend-dot-${route.id}`}
            style={{ backgroundColor: route.color }}
          />
          <span
            className="min-w-0 truncate font-medium"
            title={route.raceNames.join(' · ')}
          >
            {route.raceNames.join(' · ')}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FullscreenProfilePanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="event-track-map-profile-overlay absolute inset-x-0 bottom-0 z-20 w-full max-w-none overflow-hidden rounded-t-xl border border-x-0 border-b-0 border-white/70 bg-white/95 shadow-2xl backdrop-blur-md"
      data-testid="event-track-map-fullscreen-profile"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {children}
    </div>
  );
}

interface TerrainToggleProps {
  active: boolean;
  disabled: boolean;
  expanded: boolean;
  mapReady: boolean;
  label: string;
  onOpenSettings: () => void;
  onToggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

function TerrainToggle({
  active,
  disabled,
  expanded,
  mapReady,
  label,
  onOpenSettings,
  onToggle,
  triggerRef,
}: TerrainToggleProps) {
  return (
    <button
      ref={triggerRef}
      type="button"
      className={`event-track-map-terrain-toggle absolute right-3 top-[6.25rem] z-10 flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-stone-900/70 bg-stone-900/85 text-white'
          : 'border-white/60 bg-white/70 text-stone-800 hover:bg-white/85'
      }`}
      data-testid="event-track-map-terrain-toggle"
      aria-label={label}
      aria-expanded={active ? expanded : undefined}
      aria-controls={active ? 'event-track-map-terrain-settings' : undefined}
      aria-pressed={active}
      title={label}
      disabled={!mapReady || disabled}
      onClick={active ? onOpenSettings : onToggle}
    >
      3D
    </button>
  );
}

interface TerrainStatusNoticeProps {
  cancelLabel: string;
  failedLabel: string;
  loadingLabel: string;
  onCancel: () => void;
  onRetry: () => void;
  retryLabel: string;
  slowLabel: string;
  status: Extract<TerrainStatus, 'loading' | 'slow' | 'failed'>;
}

function TerrainStatusNotice({
  cancelLabel,
  failedLabel,
  loadingLabel,
  onCancel,
  onRetry,
  retryLabel,
  slowLabel,
  status,
}: TerrainStatusNoticeProps) {
  if (status === 'failed') {
    return (
      <TerrainLoadError
        message={failedLabel}
        onRetry={onRetry}
        retryLabel={retryLabel}
      />
    );
  }

  const isSlow = status === 'slow';

  return (
    <div
      className="absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-6rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-medium text-stone-800 shadow-sm"
      data-testid="event-track-map-terrain-status"
    >
      <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
      <span>{isSlow ? slowLabel : loadingLabel}</span>
      {isSlow ? (
        <button
          type="button"
          className="shrink-0 rounded-full bg-stone-900 px-2.5 py-1 text-white transition-colors hover:bg-stone-700"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
      ) : null}
    </div>
  );
}

interface TerrainSettingsPanelProps {
  angleLabel: string;
  exaggeration: number;
  hillshadeIntensity: number;
  hillshadeLabel: string;
  isOpen: boolean;
  onExaggerationChange: (value: number) => void;
  onHillshadeIntensityChange: (value: number) => void;
  onPitchChange: (value: number) => void;
  onReset: () => void;
  onReturnTo2D: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  pitch: number;
  reliefLabel: string;
  resetLabel: string;
  returnTo2DLabel: string;
  title: string;
}

function TerrainSettingsPanel({
  angleLabel,
  exaggeration,
  hillshadeIntensity,
  hillshadeLabel,
  isOpen,
  onExaggerationChange,
  onHillshadeIntensityChange,
  onPitchChange,
  onReset,
  onReturnTo2D,
  panelRef,
  pitch,
  reliefLabel,
  resetLabel,
  returnTo2DLabel,
  title,
}: TerrainSettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      id="event-track-map-terrain-settings"
      className="event-track-map-terrain-settings absolute left-3 right-[3.75rem] top-[6.25rem] z-20 rounded-2xl border border-white/60 bg-white/75 p-4 text-stone-900 sm:left-auto sm:w-72"
      data-testid="event-track-map-terrain-settings"
    >
      <p className="text-sm font-semibold">{title}</p>
      <label className="mt-3 block">
        <span className="flex items-center justify-between text-xs font-medium">
          <span>{angleLabel}</span>
          <output htmlFor="event-track-map-pitch">{pitch}°</output>
        </span>
        <input
          id="event-track-map-pitch"
          className="event-track-map-range mt-2 w-full"
          data-testid="event-track-map-pitch"
          type="range"
          min="30"
          max="70"
          step="5"
          value={pitch}
          onChange={(event) => onPitchChange(Number(event.target.value))}
        />
      </label>
      <label className="mt-3 block">
        <span className="flex items-center justify-between text-xs font-medium">
          <span>{reliefLabel}</span>
          <output htmlFor="event-track-map-exaggeration">
            {exaggeration.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×
          </output>
        </span>
        <input
          id="event-track-map-exaggeration"
          className="event-track-map-range mt-2 w-full"
          data-testid="event-track-map-exaggeration"
          type="range"
          min="0.5"
          max="2"
          step="0.05"
          value={exaggeration}
          onChange={(event) => onExaggerationChange(Number(event.target.value))}
        />
      </label>
      <label className="mt-3 block">
        <span className="flex items-center justify-between text-xs font-medium">
          <span>{hillshadeLabel}</span>
          <output htmlFor="event-track-map-hillshade">
            {Math.round(hillshadeIntensity * 100)}%
          </output>
        </span>
        <input
          id="event-track-map-hillshade"
          className="event-track-map-range mt-2 w-full"
          data-testid="event-track-map-hillshade"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={hillshadeIntensity}
          onChange={(event) =>
            onHillshadeIntensityChange(Number(event.target.value))
          }
        />
      </label>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold">
        <button
          type="button"
          className="rounded-full border border-stone-300/70 bg-white/55 px-3 py-1.5 transition-colors hover:bg-white/85"
          onClick={onReset}
        >
          {resetLabel}
        </button>
        <button
          type="button"
          className="rounded-full bg-stone-900/85 px-3 py-1.5 text-white transition-colors hover:bg-stone-900"
          onClick={onReturnTo2D}
        >
          {returnTo2DLabel}
        </button>
      </div>
    </div>
  );
}

interface RotationControlsProps {
  compassLabel: string;
  disabled: boolean;
  leftLabel: string;
  onRotate: (direction: -1 | 1) => void;
  rightLabel: string;
}

function RotationControls({
  compassLabel,
  disabled,
  leftLabel,
  onRotate,
  rightLabel,
}: RotationControlsProps) {
  return (
    <div className="event-track-map-rotation-controls absolute right-3 top-36 z-10 h-9">
      <button
        type="button"
        className="event-track-map-rotation-trigger absolute right-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-stone-800 transition-[opacity,transform,background-color] hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="event-track-map-rotation-button"
        aria-label={compassLabel}
        title={compassLabel}
        disabled={disabled}
        onClick={() => onRotate(-1)}
      >
        <Compass className="h-4 w-4" strokeWidth={2} />
      </button>
      <div className="event-track-map-rotation-actions absolute right-0 flex gap-2">
        <button
          type="button"
          className="event-track-map-rotation-button flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-stone-800 transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="event-track-map-rotate-left"
          aria-label={leftLabel}
          title={leftLabel}
          disabled={disabled}
          onClick={() => onRotate(1)}
        >
          <Undo className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="event-track-map-rotation-button flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-stone-800 transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="event-track-map-rotate-right"
          aria-label={rightLabel}
          title={rightLabel}
          disabled={disabled}
          onClick={() => onRotate(-1)}
        >
          <Redo className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

interface FullscreenToggleProps {
  active: boolean;
  label: string;
  onToggle: () => void;
  terrainSupported: boolean;
}

function FullscreenToggle({
  active,
  label,
  onToggle,
  terrainSupported,
}: FullscreenToggleProps) {
  const Icon = active ? Minimize2 : Maximize2;

  return (
    <button
      type="button"
      className={`event-track-map-fullscreen-toggle absolute right-3 z-10 h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-stone-800 transition-colors hover:bg-white/85 ${
        active ? 'flex' : 'hidden sm:flex'
      } ${
        terrainSupported ? 'top-[11.75rem]' : 'top-[6.25rem]'
      }`}
      data-testid="event-track-map-fullscreen-toggle"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onToggle}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

interface MobilePreviewToggleProps {
  label: string;
  onToggle: () => void;
}

function MobilePreviewToggle({ label, onToggle }: MobilePreviewToggleProps) {
  return (
    <button
      type="button"
      className="event-track-map-preview-toggle absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/30 bg-stone-950/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-stone-800 sm:hidden"
      data-testid="event-track-map-preview-toggle"
      onClick={onToggle}
    >
      <Maximize2 className="h-4 w-4" strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}

interface RotationHintProps {
  desktopLabel: string;
  mobileLabel: string;
}

function RotationHint({ desktopLabel, mobileLabel }: RotationHintProps) {
  return (
    <div
      className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/60 bg-white/75 px-3 py-2 text-xs font-medium text-stone-900"
      data-testid="event-track-map-rotation-hint"
    >
      <span className="flex items-center gap-2 sm:hidden">
        <span
          className="event-track-map-gesture-icon relative h-5 w-7 shrink-0"
          data-testid="event-track-map-gesture-icon"
          aria-hidden="true"
        >
          <Pointer
            className="event-track-map-pointer event-track-map-pointer-left"
            strokeWidth={2}
          />
          <Pointer
            className="event-track-map-pointer event-track-map-pointer-right"
            strokeWidth={2}
          />
        </span>
        {mobileLabel}
      </span>
      <span className="hidden sm:inline">{desktopLabel}</span>
    </div>
  );
}

export function EventTrackMap(props: EventTrackMapProps) {
  const flagValue = useFeatureFlagVariant(MAP_PREVIEW_FEATURE_FLAG_KEY);
  const [useFallback, setUseFallback] = useState(false);
  const variant = useFallback ? undefined : getMapPreviewVariant(flagValue);
  const experiment = useMemo(
    () => variant
      ? {
          device_form_factor: getMapDeviceFormFactor(),
          feature_flag_variant: variant,
          requested_preview_mode: getRequestedPreviewMode(variant),
        }
      : undefined,
    [variant],
  );

  useEffect(() => {
    if (variant) return;
    const timeoutId = window.setTimeout(() => setUseFallback(true), FEATURE_FLAG_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [variant]);

  if (!variant && !useFallback) return <MapPlaceholder />;

  return <ResolvedEventTrackMap {...props} experiment={experiment} />;
}

interface ResolvedEventTrackMapProps extends EventTrackMapProps {
  experiment: MapExperimentContext | undefined;
}

function ResolvedEventTrackMap({
  activePoint,
  eventId,
  eventSlug,
  routes,
  errorTitle,
  errorMessage,
  fullscreenProfile,
  onFullscreenChange,
  experiment,
}: ResolvedEventTrackMapProps) {
  const tMap = useTranslations('map');
  const autoTerrainAttemptedRef = useRef(false);
  const previewEngagedRef = useRef(false);
  const recordMapActionRef = useRef<(action: MapAction) => void>(() => undefined);
  const terrainSettingsEnabled = process.env.NODE_ENV !== 'production';
  const raceCount = useMemo(
    () => new Set(routes.flatMap((route) => route.raceIds)).size,
    [routes],
  );
  const trackPreviewEngagement = useCallback(
    (engagementType: 'open_map' | MapAction) => {
      if (!experiment || previewEngagedRef.current) return;
      previewEngagedRef.current = true;
      track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_PREVIEW_ENGAGED, {
        event_id: eventId,
        event_slug: eventSlug,
        ...experiment,
        engagement_type: engagementType,
        route_count: routes.length,
        race_count: raceCount,
      });
    },
    [eventId, eventSlug, experiment, raceCount, routes.length],
  );
  const handleMapAction = useCallback(
    (action: MapAction) => {
      trackPreviewEngagement(action);
      recordMapActionRef.current(action);
    },
    [trackPreviewEngagement],
  );
  const {
    cancelTerrain,
    containerRef,
    disableTerrain,
    hasError,
    hillshadeIntensity,
    isMapReady,
    requestTerrain,
    resetTerrainSettings,
    resizeMap,
    retryTerrain,
    rotateMap,
    setAttributionVisible,
    setHillshadeIntensity,
    setTerrainExaggeration,
    setTerrainPitch,
    showRotationHint,
    terrainExaggeration,
    terrainPitch,
    terrainStatus,
    terrainSupported,
  } = useEventTrackMap({
    activePoint,
    analyticsContext: experiment,
    eventId,
    eventSlug,
    finishLabel: tMap('routeFinish'),
    initialPreviewMode: experiment?.requested_preview_mode ?? '2d',
    onMapAction: handleMapAction,
    routes,
    startLabel: tMap('routeStart'),
    zoomInLabel: tMap('zoomIn'),
    zoomOutLabel: tMap('zoomOut'),
  });
  const { recordAction, setFullscreen, start } = useMapDeepEngagement({
    containerRef,
    eventId,
    eventSlug,
    experiment,
    raceCount,
    routeCount: routes.length,
  });
  useEffect(() => {
    recordMapActionRef.current = recordAction;
    return () => {
      recordMapActionRef.current = () => undefined;
    };
  }, [recordAction]);
  const is3D = terrainStatus === '3d';
  const isTerrainLoading =
    terrainStatus === 'loading' || terrainStatus === 'slow';
  const showTerrainStatus = isTerrainLoading || terrainStatus === 'failed';
  const terrainToggleLabel = isTerrainLoading
    ? tMap('terrainLoading')
    : terrainStatus === 'failed'
      ? tMap('terrainLoadFailed')
      : is3D
        ? terrainSettingsEnabled
          ? tMap('terrainSettings')
          : tMap('view2D')
        : tMap('view3D');
  const {
    anchorRef: fullscreenAnchorRef,
    isFullscreen,
    portalHost,
    toggleFullscreen,
  } = useMapFullscreen(resizeMap);
  const terrainSettings = useTerrainSettingsDisclosure(is3D);

  useEffect(() => {
    setFullscreen(isFullscreen);
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange, setFullscreen]);

  useEffect(() => {
    setAttributionVisible(
      isFullscreen || window.matchMedia('(min-width: 640px)').matches,
    );
  }, [isFullscreen, setAttributionVisible]);

  useEffect(() => {
    if (
      !isMapReady ||
      autoTerrainAttemptedRef.current ||
      (!isFullscreen && !window.matchMedia('(min-width: 640px)').matches)
    ) {
      return;
    }
    autoTerrainAttemptedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      const decision = getBrowserTerrainAutoLoadDecision();
      performance.mark(
        `event-track-map-terrain-auto-${decision.enabled ? 'requested' : decision.reason}`,
      );
      if (decision.enabled) requestTerrain({ includeHillshade: false });
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [isFullscreen, isMapReady, requestTerrain]);

  const terrainStatusRef = useRef(terrainStatus);
  useEffect(() => {
    terrainStatusRef.current = terrainStatus;
  }, [terrainStatus]);

  useEffect(() => {
    if (!experiment || !isMapReady) return;
    const mapElement = containerRef.current;
    if (!mapElement) return;

    let exposureTimeoutId: number | null = null;
    let exposed = false;
    const expose = () => {
      if (exposed) return;
      exposed = true;
      track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_PREVIEW_EXPOSED, {
        event_id: eventId,
        event_slug: eventSlug,
        ...experiment,
        route_count: routes.length,
        race_count: raceCount,
        terrain_status: terrainStatusRef.current,
      });
    };
    const clearExposureTimer = () => {
      if (exposureTimeoutId === null) return;
      window.clearTimeout(exposureTimeoutId);
      exposureTimeoutId = null;
    };
    const scheduleExposure = () => {
      if (exposed || exposureTimeoutId !== null) return;
      exposureTimeoutId = window.setTimeout(expose, PREVIEW_EXPOSURE_DELAY_MS);
    };

    if (typeof IntersectionObserver === 'undefined') {
      scheduleExposure();
      return clearExposureTimer;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
          scheduleExposure();
        } else {
          clearExposureTimer();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(mapElement);
    return () => {
      clearExposureTimer();
      observer.disconnect();
    };
  }, [containerRef, eventId, eventSlug, experiment, isMapReady, raceCount, routes.length]);

  const handleFullscreenToggle = () => {
    if (!isFullscreen) {
      track(ANALYTICS_EVENTS.EVENT_TRACK_MAP_FULLSCREEN_OPENED, {
        event_id: eventId,
        event_slug: eventSlug,
        ...experiment,
        route_count: routes.length,
        race_count: raceCount,
      });
    }
    toggleFullscreen();
  };

  const mapContent = hasError ? (
    <div
      className={`relative h-full w-full bg-stone-100 ${
        isFullscreen
          ? 'event-track-map-fullscreen event-track-map-portal-fullscreen'
          : ''
      }`}
      data-map-fullscreen={isFullscreen ? 'true' : undefined}
      data-map-preview={!isFullscreen ? 'true' : undefined}
      data-event-track-map-root
    >
      <ErrorMessage
        title={errorTitle}
        message={errorMessage}
        showRetry={false}
        className="h-full"
      />
      {isFullscreen ? (
        <>
          <FullscreenToggle
            active
            label={tMap('exitFullscreen')}
            onToggle={handleFullscreenToggle}
            terrainSupported={false}
          />
          {fullscreenProfile ? (
            <FullscreenProfilePanel>{fullscreenProfile}</FullscreenProfilePanel>
          ) : null}
        </>
      ) : null}
    </div>
  ) : (
    <div
      className={`relative h-full w-full bg-stone-100 ${
        isFullscreen
          ? 'event-track-map-fullscreen event-track-map-portal-fullscreen'
          : ''
      }`}
      data-map-fullscreen={isFullscreen ? 'true' : undefined}
      data-map-preview={!isFullscreen ? 'true' : undefined}
      data-rotation-hint-visible={showRotationHint ? 'true' : undefined}
      data-terrain-status={terrainStatus}
      data-terrain-controls={terrainSupported ? 'true' : 'false'}
      data-event-track-map-root
    >
      <div
        ref={containerRef}
        className="event-track-map h-full w-full"
        data-testid="event-track-map"
      />
      {terrainSupported ? (
        <>
          <RotationControls
            compassLabel={tMap('chooseRotationDirection')}
            disabled={!isMapReady || isTerrainLoading}
            leftLabel={tMap('rotateLeft')}
            onRotate={rotateMap}
            rightLabel={tMap('rotateRight')}
          />
          <TerrainToggle
            active={is3D}
            disabled={isTerrainLoading || terrainStatus === 'failed'}
            expanded={terrainSettings.isOpen}
            mapReady={isMapReady}
            label={terrainToggleLabel}
            onOpenSettings={
              terrainSettingsEnabled
                ? () => terrainSettings.setIsOpen((isOpen) => !isOpen)
                : disableTerrain
            }
            onToggle={requestTerrain}
            triggerRef={terrainSettings.triggerRef}
          />
          {terrainSettingsEnabled ? (
            <TerrainSettingsPanel
              angleLabel={tMap('terrainAngle')}
              exaggeration={terrainExaggeration}
              hillshadeIntensity={hillshadeIntensity}
              hillshadeLabel={tMap('terrainHillshade')}
              isOpen={terrainSettings.isOpen}
              onExaggerationChange={setTerrainExaggeration}
              onHillshadeIntensityChange={setHillshadeIntensity}
              onPitchChange={setTerrainPitch}
              onReset={resetTerrainSettings}
              onReturnTo2D={() => {
                terrainSettings.setIsOpen(false);
                disableTerrain();
              }}
              panelRef={terrainSettings.panelRef}
              pitch={terrainPitch}
              reliefLabel={tMap('terrainRelief')}
              resetLabel={tMap('terrainReset')}
              returnTo2DLabel={tMap('view2D')}
              title={tMap('terrainSettings')}
            />
          ) : null}
          {showTerrainStatus ? (
            <TerrainStatusNotice
              cancelLabel={tMap('terrainCancel')}
              failedLabel={tMap('terrainLoadFailed')}
              loadingLabel={tMap('terrainLoading')}
              onCancel={cancelTerrain}
              onRetry={retryTerrain}
              retryLabel={tMap('terrainRetry')}
              slowLabel={tMap('terrainLoadingSlow')}
              status={terrainStatus}
            />
          ) : null}
        </>
      ) : null}
      <FullscreenToggle
        active={isFullscreen}
        label={
          isFullscreen
            ? tMap('exitFullscreen')
            : tMap('enterFullscreen')
        }
        onToggle={handleFullscreenToggle}
        terrainSupported={terrainSupported}
      />
      {!isFullscreen ? (
        <MobilePreviewToggle
          label={tMap('openRouteFullscreen')}
          onToggle={() => {
            trackPreviewEngagement('open_map');
            start();
            handleFullscreenToggle();
          }}
        />
      ) : null}
      {is3D && showRotationHint ? (
        <RotationHint
          desktopLabel={tMap('rotateHintDesktop')}
          mobileLabel={tMap('rotateHintMobile')}
        />
      ) : null}
      <TrackLegend
        routes={routes}
        fullscreen={isFullscreen}
        offsetForHint={isFullscreen && is3D && showRotationHint}
      />
      {isFullscreen && fullscreenProfile ? (
        <FullscreenProfilePanel>{fullscreenProfile}</FullscreenProfilePanel>
      ) : null}
    </div>
  );

  return (
    <>
      <div
        ref={fullscreenAnchorRef}
        className="h-[336px] w-full bg-stone-100 sm:h-[480px]"
        data-testid="event-track-map-anchor"
      />
      {portalHost ? createPortal(mapContent, portalHost) : null}
    </>
  );
}
