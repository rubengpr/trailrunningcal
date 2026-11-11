'use client';

import { useState } from 'react';
import type { PointerEvent } from 'react';
import type { Locale } from '@/i18n';

interface StackedPercentageChartProps {
  days: { date: string }[];
  distributions: { key: string; color: string; percentage: number }[][];
  segments: { key: string; color: string; label: string }[];
  summary: string;
  locale: Locale;
  tooltipClassName?: string;
}

export function StackedPercentageChart({
  days,
  distributions,
  segments,
  summary,
  locale,
  tooltipClassName = 'w-44',
}: StackedPercentageChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeDay = activeIndex === null ? undefined : days[activeIndex];
  const activeDistribution = activeIndex === null ? undefined : distributions[activeIndex];
  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const formatDate = (date: string | undefined) => date
    ? formatter.format(new Date(`${date}T12:00:00`))
    : '';

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || days.length === 0) return;
    const ratio = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    setActiveIndex(Math.round(ratio * (days.length - 1)));
  };

  return (
    <>
      <div
        aria-label={summary}
        className="relative mt-4 h-44 border-b border-l border-stone-200 px-2 pb-5 pt-2"
        role="img"
        onPointerLeave={() => setActiveIndex(null)}
        onPointerMove={handlePointerMove}
      >
        <div className="absolute inset-x-2 top-2 h-[calc(100%-1.75rem)]">
          <div className="pointer-events-none absolute inset-0 grid grid-rows-4">
            {[0, 1, 2, 3].map((row) => (
              <span key={row} className="border-t border-dashed border-stone-200/80" />
            ))}
          </div>
          <div className="relative flex h-full items-stretch gap-px">
            {distributions.map((distribution, index) => (
              <div
                key={days[index]?.date}
                className="flex min-w-0 flex-1 flex-col-reverse overflow-hidden rounded-[2px]"
              >
                {distribution.map(({ color, key, percentage }) => (
                  <span key={key} style={{ backgroundColor: color, height: `${percentage}%` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="absolute bottom-0 left-2 text-[10px] tabular-nums text-stone-500">
          {formatDate(days[0]?.date)}
        </span>
        <span className="absolute bottom-0 right-0 text-[10px] tabular-nums text-stone-500">
          {formatDate(days.at(-1)?.date)}
        </span>
        <span className="absolute left-2 top-2 text-[10px] font-medium text-stone-500">100%</span>
        {activeDay && activeDistribution && activeIndex !== null ? (
          <div
            className={`pointer-events-none absolute top-3 z-10 rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-md ${tooltipClassName} ${activeIndex > days.length * 0.7 ? '-translate-x-full' : ''}`}
            style={{ left: `${((activeIndex + 0.5) / days.length) * 100}%` }}
          >
            <p className="text-stone-500">{formatDate(activeDay.date)}</p>
            <dl className="mt-2 space-y-1 border-t border-stone-100 pt-2">
              {activeDistribution.map(({ key, percentage }) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt>{segments.find((segment) => segment.key === key)?.label}</dt>
                  <dd>{percentage.toFixed(1)}%</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-medium text-stone-500">
        {segments.map(({ color, key, label }) => (
          <span key={key} className="flex items-center gap-1.5">
            <i aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
