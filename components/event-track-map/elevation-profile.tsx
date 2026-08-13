'use client';

import { useId, useState } from 'react';
import type { ElevationProfile } from '@/types/race-track.types';

const CHART_WIDTH = 1_000;
const CHART_HEIGHT = 220;
const VERTICAL_INSET = 12;

interface ElevationProfileChartProps {
  profiles: ElevationProfile[];
  chartDescription: string;
}

function formatDistance(value: number): string {
  return value.toLocaleString('es-ES', {
    maximumFractionDigits: value < 10 ? 1 : 0,
  });
}

function formatElevation(value: number): string {
  return Math.round(value).toLocaleString('es-ES');
}

function getProfilePaths(profile: ElevationProfile): {
  area: string;
  line: string;
} {
  const elevationRange = profile.maximumElevationM - profile.minimumElevationM;
  const distanceRange = profile.distanceKm || 1;
  const drawableHeight = CHART_HEIGHT - VERTICAL_INSET * 2;
  const coordinates = profile.points.map((point) => {
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
  profiles,
  chartDescription,
}: ElevationProfileChartProps) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? '');
  const selected = profiles.find(({ id }) => id === selectedId) ?? profiles[0];
  const gradientId = `elevation-profile-${useId().replaceAll(':', '')}`;

  if (!selected) return null;

  const paths = getProfilePaths(selected);

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
                onClick={() => setSelectedId(profile.id)}
              >
                {profile.raceNames.join(' · ')}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className={`${profiles.length > 1 ? 'mt-4' : ''} relative h-32 w-full overflow-hidden sm:h-36`}
        data-testid="elevation-profile-plot"
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
      </div>
    </div>
  );
}
