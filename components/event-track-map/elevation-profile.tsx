'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  downsampleElevationPoints,
  getElevationCursorPoint,
} from '@/lib/race-tracks/elevation-profile';
import type {
  ElevationProfile,
  ElevationProfileCursorPoint,
} from '@/types/race-track.types';

const CHART_WIDTH = 1_000;
const CHART_HEIGHT = 220;
const VERTICAL_INSET = 12;

interface ElevationProfileChartProps {
  activePoint: ElevationProfileCursorPoint | null;
  profiles: ElevationProfile[];
  chartDescription: string;
  onActivePointChange: (point: ElevationProfileCursorPoint | null) => void;
  onSelectedIdChange: (id: string) => void;
  selectedId: string;
}

function formatDistance(value: number): string {
  return value.toLocaleString('es-ES', {
    maximumFractionDigits: value < 10 ? 1 : 0,
  });
}

function formatElevation(value: number): string {
  return Math.round(value).toLocaleString('es-ES');
}

function formatCursorDistance(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatSlope(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  });
}

function getProfilePaths(profile: ElevationProfile): {
  area: string;
  line: string;
} {
  const elevationRange = profile.maximumElevationM - profile.minimumElevationM;
  const distanceRange = profile.distanceKm || 1;
  const drawableHeight = CHART_HEIGHT - VERTICAL_INSET * 2;
  const coordinates = downsampleElevationPoints(profile.points).map((point) => {
    const x = (point.distanceKm / distanceRange) * CHART_WIDTH;
    const ratio = elevationRange === 0
      ? 0.5
      : (point.elevationM - profile.minimumElevationM) / elevationRange;
    const y = CHART_HEIGHT - VERTICAL_INSET - ratio * drawableHeight;
    return [x, y] as const;
  });
  const line = coordinates
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');
  const firstX = coordinates[0]![0];
  const lastX = coordinates.at(-1)![0];

  return {
    line,
    area: `${line} L ${lastX.toFixed(2)} ${CHART_HEIGHT} L ${firstX.toFixed(2)} ${CHART_HEIGHT} Z`,
  };
}

export function ElevationProfileChart({
  activePoint,
  profiles,
  chartDescription,
  onActivePointChange,
  onSelectedIdChange,
  selectedId,
}: ElevationProfileChartProps) {
  const selected = profiles.find(({ id }) => id === selectedId) ?? profiles[0];
  const gradientId = `elevation-profile-${useId().replaceAll(':', '')}`;
  const plotRef = useRef<HTMLDivElement>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);
  const touchPointerIdRef = useRef<number | null>(null);
  const [hasPersistentTouchPoint, setHasPersistentTouchPoint] = useState(false);

  useEffect(() => {
    if (!hasPersistentTouchPoint) return;

    const clearFromOutsideTouch = (event: PointerEvent) => {
      if (
        event.pointerType === 'touch' &&
        !plotRef.current?.contains(event.target as Node)
      ) {
        setHasPersistentTouchPoint(false);
        onActivePointChange(null);
      }
    };
    document.addEventListener('pointerdown', clearFromOutsideTouch, true);
    return () => {
      document.removeEventListener('pointerdown', clearFromOutsideTouch, true);
    };
  }, [hasPersistentTouchPoint, onActivePointChange]);

  useEffect(() => () => {
    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
    }
  }, []);

  if (!selected) return null;

  const paths = getProfilePaths(selected);
  const activeForSelected = activePoint?.routeId === selected.id
    ? activePoint
    : null;
  const activeXPercent = activeForSelected
    ? (activeForSelected.distanceKm / (selected.distanceKm || 1)) * 100
    : 0;
  const elevationRange = selected.maximumElevationM - selected.minimumElevationM;
  const activeYPercent = activeForSelected
    ? elevationRange === 0
      ? 50
      : ((CHART_HEIGHT -
          VERTICAL_INSET -
          ((activeForSelected.elevationM - selected.minimumElevationM) /
            elevationRange) *
            (CHART_HEIGHT - VERTICAL_INSET * 2)) /
          CHART_HEIGHT) *
        100
    : 0;
  const tooltipAlignment = activeXPercent < 15
    ? 'translate-x-0'
    : activeXPercent > 85
      ? '-translate-x-full'
      : '-translate-x-1/2';

  const updateFromClientX = (clientX: number) => {
    const bounds = plotRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;
    const ratio = Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1);
    onActivePointChange(
      getElevationCursorPoint(selected, ratio * selected.distanceKm),
    );
  };

  const scheduleUpdate = (clientX: number) => {
    pendingClientXRef.current = clientX;
    if (pointerFrameRef.current !== null) return;
    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      if (pendingClientXRef.current !== null) {
        updateFromClientX(pendingClientXRef.current);
      }
    });
  };

  const cancelScheduledUpdate = () => {
    pendingClientXRef.current = null;
    if (pointerFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    touchPointerIdRef.current = event.pointerId;
    setHasPersistentTouchPoint(false);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateFromClientX(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType === 'touch' &&
      touchPointerIdRef.current !== event.pointerId
    ) {
      return;
    }
    scheduleUpdate(event.clientX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    cancelScheduledUpdate();
    updateFromClientX(event.clientX);
    touchPointerIdRef.current = null;
    setHasPersistentTouchPoint(true);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    cancelScheduledUpdate();
    touchPointerIdRef.current = null;
    setHasPersistentTouchPoint(false);
    onActivePointChange(null);
  };

  return (
    <div
      className="border-t border-stone-200 bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] pb-4 pt-4 sm:pb-5"
      data-testid="elevation-profile"
    >
      {profiles.length > 1 ? (
        <div
          className="event-track-profile-picker flex max-w-full gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6"
          aria-label={chartDescription}
        >
          {profiles.map((profile) => {
            const isSelected = profile.id === selected.id;
            return (
              <button
                key={profile.id}
                type="button"
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900'
                }`}
                aria-pressed={isSelected}
                onClick={() => {
                  setHasPersistentTouchPoint(false);
                  onActivePointChange(null);
                  onSelectedIdChange(profile.id);
                }}
              >
                {profile.raceNames.join(' · ')}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        ref={plotRef}
        className={`${profiles.length > 1 ? 'mt-4' : ''} relative h-32 w-full overflow-hidden sm:h-36`}
        data-testid="elevation-profile-plot"
        style={{ touchAction: 'pan-y' }}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') updateFromClientX(event.clientX);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') {
            cancelScheduledUpdate();
            onActivePointChange(null);
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${chartDescription}: ${selected.raceNames.join(' · ')}, ${formatDistance(selected.distanceKm)} km`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={selected.color} stopOpacity="0.38" />
              <stop offset="100%" stopColor={selected.color} stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path d={paths.area} fill={`url(#${gradientId})`} />
          <path
            d={paths.line}
            fill="none"
            stroke={selected.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-[linear-gradient(0deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0)_100%)]" />
        <div className="pointer-events-none absolute inset-0 text-[11px] tabular-nums text-stone-500">
          <span className="absolute left-3 top-1.5 sm:left-4">
            {formatElevation(selected.maximumElevationM)}
          </span>
          <span className="absolute bottom-1.5 left-3 sm:left-4">
            {formatElevation(selected.minimumElevationM)}
          </span>
          <span className="absolute bottom-1.5 right-3 sm:right-4">
            {formatDistance(selected.distanceKm)} km
          </span>
        </div>
        {activeForSelected ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            <span
              className="absolute inset-y-0 w-px bg-stone-800/35"
              data-testid="elevation-profile-cursor"
              style={{ left: `${activeXPercent}%` }}
            />
            <span
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-sm"
              data-testid="elevation-profile-point"
              style={{
                backgroundColor: selected.color,
                left: `${activeXPercent}%`,
                top: `${activeYPercent}%`,
              }}
            />
            <span
              className={`absolute top-2 whitespace-nowrap rounded-full bg-stone-950/90 px-2.5 py-1 text-xs font-semibold tabular-nums text-white shadow-sm ${tooltipAlignment}`}
              data-testid="elevation-profile-tooltip"
              style={{ left: `${activeXPercent}%` }}
            >
              {formatCursorDistance(activeForSelected.distanceKm)} km ·{' '}
              {formatElevation(activeForSelected.elevationM)} m ·{' '}
              {formatSlope(activeForSelected.slopePercent)}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
