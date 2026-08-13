'use client';

import { useTranslations } from 'next-intl';
import { Compass, Maximize2, Minimize2, Pointer, Redo, Undo } from 'lucide-react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ErrorMessage } from '@/components/ui/error-message';
import { useEventTrackMap } from '@/hooks/use-event-track-map';
import { useMapFullscreen } from '@/hooks/use-map-fullscreen';
import { useTerrainSettingsDisclosure } from '@/hooks/use-terrain-settings-disclosure';
import type { TrackRoute } from '@/types/race-track.types';

export interface EventTrackMapProps {
  eventId: string;
  eventSlug: string;
  routes: TrackRoute[];
  errorTitle: string;
  errorMessage: string;
}

function TrackLegend({ routes }: Pick<EventTrackMapProps, 'routes'>) {
  return (
    <ul
      className="event-track-map-legend absolute bottom-3 left-1/2 z-10 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-white/60 bg-white/70 px-3 py-2.5 text-center text-xs leading-4 text-stone-900 sm:px-4 sm:text-sm"
      data-testid="event-track-map-legend"
    >
      {routes.map((route) => (
        <li key={route.id} className="flex shrink-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/90"
            data-testid={`event-track-map-legend-dot-${route.id}`}
            style={{ backgroundColor: route.color }}
          />
          <span className="whitespace-nowrap font-medium">
            {route.raceNames.join(' · ')}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface TerrainToggleProps {
  active: boolean;
  available: boolean;
  expanded: boolean;
  mapReady: boolean;
  label: string;
  onOpenSettings: () => void;
  onToggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

function TerrainToggle({
  active,
  available,
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
      disabled={!mapReady || !available}
      onClick={active ? onOpenSettings : onToggle}
    >
      3D
    </button>
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
      className={`event-track-map-fullscreen-toggle absolute right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-stone-800 transition-colors hover:bg-white/85 ${
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

export function EventTrackMap({
  eventId,
  eventSlug,
  routes,
  errorTitle,
  errorMessage,
}: EventTrackMapProps) {
  const tMap = useTranslations('map');
  const terrainSettingsEnabled = process.env.NODE_ENV !== 'production';
  const {
    containerRef,
    hasError,
    hillshadeIntensity,
    is3D,
    isMapReady,
    isTerrainAvailable,
    resetTerrainSettings,
    resizeMap,
    rotateMap,
    setHillshadeIntensity,
    setTerrainExaggeration,
    setTerrainPitch,
    showRotationHint,
    terrainExaggeration,
    terrainPitch,
    terrainSupported,
    toggleTerrain,
  } = useEventTrackMap({
    eventId,
    eventSlug,
    finishLabel: tMap('routeFinish'),
    routes,
    startLabel: tMap('routeStart'),
    zoomInLabel: tMap('zoomIn'),
    zoomOutLabel: tMap('zoomOut'),
  });
  const {
    anchorRef: fullscreenAnchorRef,
    isFullscreen,
    portalHost,
    toggleFullscreen,
  } = useMapFullscreen(resizeMap);
  const terrainSettings = useTerrainSettingsDisclosure(is3D);

  const mapContent = hasError ? (
    <div
      className={`relative h-full w-full bg-stone-100 ${
        isFullscreen
          ? 'event-track-map-fullscreen event-track-map-portal-fullscreen'
          : ''
      }`}
      data-map-fullscreen={isFullscreen ? 'true' : undefined}
      data-event-track-map-root
    >
      <ErrorMessage
        title={errorTitle}
        message={errorMessage}
        showRetry={false}
        className="h-full"
      />
      {isFullscreen ? (
        <FullscreenToggle
          active
          label={tMap('exitFullscreen')}
          onToggle={toggleFullscreen}
          terrainSupported={false}
        />
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
      data-rotation-hint-visible={showRotationHint ? 'true' : undefined}
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
            disabled={!isMapReady}
            leftLabel={tMap('rotateLeft')}
            onRotate={rotateMap}
            rightLabel={tMap('rotateRight')}
          />
          <TerrainToggle
            active={is3D}
            available={isTerrainAvailable}
            expanded={terrainSettings.isOpen}
            mapReady={isMapReady}
            label={
              !isTerrainAvailable
                ? tMap('terrainUnavailable')
                : is3D
                  ? terrainSettingsEnabled
                    ? tMap('terrainSettings')
                    : tMap('view2D')
                  : tMap('view3D')
            }
            onOpenSettings={
              terrainSettingsEnabled
                ? () => terrainSettings.setIsOpen((isOpen) => !isOpen)
                : toggleTerrain
            }
            onToggle={toggleTerrain}
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
                toggleTerrain();
              }}
              panelRef={terrainSettings.panelRef}
              pitch={terrainPitch}
              reliefLabel={tMap('terrainRelief')}
              resetLabel={tMap('terrainReset')}
              returnTo2DLabel={tMap('view2D')}
              title={tMap('terrainSettings')}
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
        onToggle={toggleFullscreen}
        terrainSupported={terrainSupported}
      />
      {is3D && showRotationHint ? (
        <RotationHint
          desktopLabel={tMap('rotateHintDesktop')}
          mobileLabel={tMap('rotateHintMobile')}
        />
      ) : null}
      <TrackLegend routes={routes} />
    </div>
  );

  return (
    <>
      <div
        ref={fullscreenAnchorRef}
        className="h-[420px] w-full bg-stone-100 sm:h-[480px]"
        data-testid="event-track-map-anchor"
      />
      {portalHost ? createPortal(mapContent, portalHost) : null}
    </>
  );
}
