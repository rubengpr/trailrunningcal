import { localeTags, type Locale } from '@/i18n';
import type { DistanceGroup } from '@/lib/constants';
import { getDistanceGroup } from '@/lib/races/utils';

interface DistanceBadgeProps {
  distanceKm: number;
  locale: Locale;
  size?: 'sm' | 'md';
  variant?: 'default' | 'metallic';
}

const COLOR_CLASSES: Record<DistanceGroup, string> = {
  '0-10': 'bg-[#EFF8F3] text-[#37624D]',
  '10-20': 'bg-[#D8EEE3] text-[#2B5945]',
  '20-30': 'bg-[#B8DCCD] text-[#244B3D]',
  '30-40': 'bg-[#87B9A4] text-[#16382B]',
  '40-50': 'bg-[#477B64] text-white',
  '50+': 'bg-[#224D3C] text-white',
};

const METALLIC_CLASSES = 'bg-[#fefdfb] text-slate-800';

const SIZE_CLASSES = {
  sm: 'rounded-sm px-2 py-0.5 text-[10px]',
  md: 'rounded-md px-2 py-1 text-xs',
} as const;

function formatDistance(distanceKm: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale], {
    maximumFractionDigits: 0,
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
