import { Tooltip } from '@/components/ui/tooltip';

interface ElevationIntensityProps {
  distanceKm: number;
  elevationGainM: number | null;
  tooltip: string;
}

type Intensity = 'low' | 'medium' | 'high';

function getIntensity(ratio: number): Intensity {
  if (ratio < 35) return 'low';
  if (ratio < 60) return 'medium';
  return 'high';
}

const badgeClasses: Record<Intensity, string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  high: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function ElevationIntensity({
  distanceKm,
  elevationGainM,
  tooltip,
}: ElevationIntensityProps) {
  const ratio =
    elevationGainM !== null && distanceKm > 0
      ? Math.round(elevationGainM / distanceKm)
      : null;
  const intensity = ratio === null ? null : getIntensity(ratio);
  const colorClass = intensity
    ? badgeClasses[intensity]
    : 'border-gray-200 bg-gray-50 text-gray-500';

  return (
    <Tooltip text={tooltip} size="sm" className="justify-self-start sm:justify-self-end">
      <span
        className={`inline-flex items-baseline gap-0.5 rounded-md border px-2 py-1 font-medium ${colorClass}`}
      >
        <span className="text-xs leading-none">{ratio ?? '—'}</span>
        {ratio !== null && (
          <span className="text-[7px] uppercase tracking-[0.12em] opacity-75">
            m/km
          </span>
        )}
      </span>
    </Tooltip>
  );
}
