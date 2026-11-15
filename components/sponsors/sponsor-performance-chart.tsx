'use client';

import { useState } from 'react';
import type { PointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n';
import type { ReportingPeriod, SponsorDashboardDay } from '@/types/sponsor-dashboard.types';

const CHART_WIDTH = 1_000;
const CHART_HEIGHT = 260;
const CHART_INSET = 14;

interface SponsorPerformanceChartProps {
  days: SponsorDashboardDay[];
  locale: Locale;
  period: ReportingPeriod;
}

function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(
    new Date(`${date}T12:00:00`),
  );
}

function getMonthTicks(days: SponsorDashboardDay[], locale: Locale) {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short' });

  return days.flatMap(({ date }, index) => {
    if (index !== 0 && !date.endsWith('-01')) return [];

    const position = (index / Math.max(days.length - 1, 1)) * 100;
    const label = index === 0
      ? new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
        new Date(`${date}T12:00:00`),
      )
      : formatter.format(new Date(`${date}T12:00:00`));

    return [{ date, label, position }];
  });
}

function getChart(days: SponsorDashboardDay[]) {
  const maximum = Math.max(
    ...days.flatMap(({ impressions, uniqueUsers }) => [impressions, uniqueUsers]),
    1,
  );
  const height = CHART_HEIGHT - CHART_INSET * 2;
  const getLine = (metric: 'impressions' | 'uniqueUsers') => days.map((day, index) => {
    const x = (index / Math.max(days.length - 1, 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - CHART_INSET - (day[metric] / maximum) * height;
    return [x, y] as const;
  }).map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const impressionsLine = getLine('impressions');
  const uniqueUsersLine = getLine('uniqueUsers');

  return {
    impressionsLine,
    uniqueUsersLine,
    maximum,
    area: `${impressionsLine} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`,
  };
}

export function SponsorPerformanceChart({
  days,
  locale,
  period,
}: SponsorPerformanceChartProps) {
  const t = useTranslations('sponsorDashboard');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chart = getChart(days);
  const monthTicks = period === 'all' ? getMonthTicks(days, locale) : [];
  const activeDay = activeIndex === null ? null : days[activeIndex];
  const impressions = days.reduce((total, day) => total + day.impressions, 0);
  const uniqueUsers = days.reduce((total, day) => total + day.uniqueUsers, 0);
  const activeX = activeIndex === null ? 0 : (activeIndex / Math.max(days.length - 1, 1)) * 100;
  const activeY = activeDay === null
    ? 0
    : (CHART_HEIGHT - CHART_INSET - (activeDay.impressions / chart.maximum) *
      (CHART_HEIGHT - CHART_INSET * 2)) / CHART_HEIGHT * 100;
  const summary = t('chart.summary', {
    start: formatDate(days[0]?.date ?? '', locale),
    end: formatDate(days.at(-1)?.date ?? '', locale),
    impressions: new Intl.NumberFormat(locale).format(impressions),
    uniqueUsers: new Intl.NumberFormat(locale).format(uniqueUsers),
  });
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const ratio = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    setActiveIndex(Math.round(ratio * (days.length - 1)));
  };

  return (
    <section className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-base font-semibold tracking-tight">{t('chart.title')}</h2>
        <div className="flex items-center gap-3 text-[11px] font-medium text-stone-500">
          <span className="flex items-center gap-1.5">
            <i aria-hidden="true" className="size-2 rounded-full bg-stone-950" />
            {t('metrics.impressions')}
          </span>
          <span className="flex items-center gap-1.5">
            <i aria-hidden="true" className="size-2 rounded-full bg-emerald-700" />
            {t('metrics.uniqueUsers')}
          </span>
        </div>
      </div>
      <div
        aria-label={summary}
        className="relative h-56 overflow-hidden md:h-64"
        role="img"
        onPointerLeave={() => setActiveIndex(null)}
        onPointerMove={handlePointerMove}
      >
        <svg aria-hidden="true" className="h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          <defs>
            <linearGradient id="sponsor-impressions-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1c1917" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#1c1917" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path d={chart.area} fill="url(#sponsor-impressions-gradient)" />
          <path d={chart.impressionsLine} fill="none" stroke="#1c1917" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <path d={chart.uniqueUsersLine} fill="none" stroke="#047857" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="pointer-events-none absolute inset-0 text-xs tabular-nums text-stone-500">
          <span className="absolute left-3 top-2">{new Intl.NumberFormat(locale).format(chart.maximum)}</span>
          <span className="absolute bottom-2 left-3">0</span>
          {period === 'all' ? monthTicks.map(({ date, label, position }, index) => (
            <span
              key={date}
              className={`absolute bottom-2 ${index === 0 ? '' : index === monthTicks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: `${position}%` }}
            >
              {label}
            </span>
          )) : (
            <>
              <span className="absolute bottom-2 left-24">{formatDate(days[0]?.date ?? '', locale)}</span>
              <span className="absolute bottom-2 right-3">{formatDate(days.at(-1)?.date ?? '', locale)}</span>
            </>
          )}
        </div>
        {activeDay ? (
          <div className="pointer-events-none absolute inset-0">
            <span className="absolute inset-y-0 w-px bg-stone-950/35" style={{ left: `${activeX}%` }} />
            <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-stone-50 bg-stone-950" style={{ left: `${activeX}%`, top: `${activeY}%` }} />
            <div className={`absolute top-3 w-44 rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-md ${activeX > 78 ? '-translate-x-full' : activeX < 22 ? '' : '-translate-x-1/2'}`} style={{ left: `${activeX}%` }}>
              <p className="text-stone-500">{formatDate(activeDay.date, locale)}</p>
              <dl className="mt-2 space-y-1 border-t border-stone-100 pt-2">
                <div className="flex justify-between gap-4"><dt>{t('metrics.impressions')}</dt><dd>{new Intl.NumberFormat(locale).format(activeDay.impressions)}</dd></div>
                <div className="flex justify-between gap-4"><dt>{t('metrics.uniqueUsers')}</dt><dd>{new Intl.NumberFormat(locale).format(activeDay.uniqueUsers)}</dd></div>
                <div className="flex justify-between gap-4"><dt>{t('metrics.clicks')}</dt><dd>{new Intl.NumberFormat(locale).format(activeDay.clicks)}</dd></div>
                <div className="flex justify-between gap-4"><dt>{t('metrics.ctr')}</dt><dd>{((activeDay.clicks / activeDay.impressions) * 100).toFixed(2)}%</dd></div>
              </dl>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
