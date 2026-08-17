import type { Locale } from '@/i18n';
import type { DistanceGroup } from '@/lib/constants';
import { getDistanceGroup } from '@/lib/races/utils';

interface DistanceBadgeProps {
  distanceKm: number;
  locale: Locale;
  size?: 'sm' | 'md';
  variant?: 'default' | 'metallic';
}

const COLOR_CLASSES: Record<DistanceGroup, string> = {
  '0-10': 'bg-amber-100 text-amber-800',
  '10-20': 'bg-emerald-100 text-emerald-800',
  '20-30': 'bg-sky-100 text-sky-800',
  '30-40': 'bg-violet-100 text-violet-800',
  '40-50': 'bg-rose-100 text-rose-800',
  '50+': 'bg-neutral-700 text-white',
};

const METALLIC_CLASSES = 'bg-[#fefdfb] text-slate-800';

const SIZE_CLASSES = {
  sm: 'rounded-sm px-2 py-0.5 text-[10px]',
  md: 'rounded-md px-2 py-1 text-xs',
} as const;

function formatDistance(distanceKm: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    maximumFractionDigits: 1,
  }).format(distanceKm);
}

export function DistanceBadge({
  distanceKm,
  locale,
  size = 'md',
  variant = 'default',
}: DistanceBadgeProps) {
  const group = getDistanceGroup(distanceKm);

  return (
    <span
      data-distance-group={group}
      className={`inline-flex shrink-0 items-baseline justify-center gap-0.5 font-medium tabular-nums ${
        variant === 'metallic' ? METALLIC_CLASSES : COLOR_CLASSES[group]
      } ${SIZE_CLASSES[size]}`}
    >
      <span>{formatDistance(distanceKm, locale)}</span>
      <span className="text-[8px] uppercase opacity-75">km</span>
    </span>
  );
}
