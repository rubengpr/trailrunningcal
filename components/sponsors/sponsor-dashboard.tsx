'use client';

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ChevronDown,
  Download,
  Eye,
  MousePointerClick,
  Percent,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n';
import { downloadSponsorReport } from '@/lib/api/sponsor-report';

const CHART_WIDTH = 1_000;
const CHART_HEIGHT = 260;
const CHART_INSET = 14;
const ALL_VIEW_START = '2026-01-01';

type ReportingPeriod = 'last30Days' | 'lastMonth' | 'all';
type Campaign = 'banner' | 'sticky';
type AudienceView = 'country' | 'region';

export interface SponsorDashboardDay {
  date: string;
  clicks: number;
  impressions: number;
  uniqueUsers: number;
}

export interface SponsorDashboardData {
  dailyImpressions: SponsorDashboardDay[];
}

function buildHistoricalDays(): SponsorDashboardDay[] {
  const start = new Date(`${ALL_VIEW_START}T12:00:00Z`);
  const end = new Date('2026-08-07T12:00:00Z');
  const days: SponsorDashboardDay[] = [];

  for (let current = start, index = 0; current <= end; index += 1) {
    const isWeekend = current.getUTCDay() === 0 || current.getUTCDay() === 6;
    const impressions = Math.round(
      (150 + (index % 11) * 14 + Math.floor(index / 31) * 20) * (isWeekend ? 1.18 : 1),
    );
    days.push({
      date: current.toISOString().slice(0, 10),
      impressions,
      clicks: Math.max(1, Math.round(impressions * (0.0105 + (index % 3) * 0.0008))),
      uniqueUsers: Math.round(impressions * (0.63 + (index % 5) * 0.025)),
    });
    current = new Date(current.getTime() + 86_400_000);
  }

  return days;
}

const bannerCampaignData: SponsorDashboardData = {
  dailyImpressions: [
    ...buildHistoricalDays(),
    { date: '2026-08-08', impressions: 543, clicks: 7 },
    { date: '2026-08-09', impressions: 512, clicks: 6 },
    { date: '2026-08-10', impressions: 359, clicks: 4 },
    { date: '2026-08-11', impressions: 341, clicks: 4 },
    { date: '2026-08-12', impressions: 354, clicks: 4 },
    { date: '2026-08-13', impressions: 376, clicks: 5 },
    { date: '2026-08-14', impressions: 455, clicks: 5 },
    { date: '2026-08-15', impressions: 604, clicks: 7 },
    { date: '2026-08-16', impressions: 560, clicks: 7 },
    { date: '2026-08-17', impressions: 368, clicks: 4 },
    { date: '2026-08-18', impressions: 350, clicks: 4 },
    { date: '2026-08-19', impressions: 363, clicks: 4 },
    { date: '2026-08-20', impressions: 389, clicks: 5 },
    { date: '2026-08-21', impressions: 490, clicks: 6 },
    { date: '2026-08-22', impressions: 643, clicks: 8 },
    { date: '2026-08-23', impressions: 595, clicks: 7 },
    { date: '2026-08-24', impressions: 398, clicks: 5 },
    { date: '2026-08-25', impressions: 376, clicks: 5 },
    { date: '2026-08-26', impressions: 389, clicks: 5 },
    { date: '2026-08-27', impressions: 420, clicks: 5 },
    { date: '2026-08-28', impressions: 534, clicks: 6 },
    { date: '2026-08-29', impressions: 718, clicks: 9 },
    { date: '2026-08-30', impressions: 665, clicks: 8 },
    { date: '2026-08-31', impressions: 420, clicks: 5 },
    { date: '2026-09-01', impressions: 398, clicks: 5 },
    { date: '2026-09-02', impressions: 411, clicks: 5 },
    { date: '2026-09-03', impressions: 446, clicks: 5 },
    { date: '2026-09-04', impressions: 573, clicks: 7 },
    { date: '2026-09-05', impressions: 779, clicks: 9 },
    { date: '2026-09-06', impressions: 713, clicks: 9 },
    { date: '2026-09-07', impressions: 455, clicks: 5 },
  ].map((day, index) => ({
    ...day,
    uniqueUsers: Math.round(day.impressions * (0.61 + (index % 5) * 0.025)),
  })),
};

const stickyCampaignData: SponsorDashboardData = {
  dailyImpressions: bannerCampaignData.dailyImpressions.map((day, index) => ({
    date: day.date,
    impressions: Math.round(day.impressions * (0.38 + (index % 4) * 0.03)),
    clicks: Math.max(1, Math.round(day.clicks * (0.45 + (index % 3) * 0.05))),
    uniqueUsers: Math.max(1, Math.round(day.uniqueUsers * (0.48 + (index % 3) * 0.04))),
  })),
};

const audienceSegments = {
  country: [
    { color: '#0f766e', key: 'spain', weight: 91 },
    { color: '#2563eb', key: 'france', weight: 5 },
    { color: '#d97706', key: 'portugal', weight: 1.8 },
    { color: '#7c3aed', key: 'unitedKingdom', weight: 1.4 },
    { color: '#db2777', key: 'unitedStates', weight: 1.1 },
    { color: '#a8a29e', key: 'other', weight: 0.7 },
  ],
  region: [
    { color: '#0f766e', key: 'catalonia', weight: 1 },
    { color: '#2563eb', key: 'valencia', weight: 1 },
    { color: '#d97706', key: 'andalusia', weight: 1 },
    { color: '#7c3aed', key: 'basqueCountry', weight: 1 },
    { color: '#db2777', key: 'galicia', weight: 1 },
    { color: '#0891b2', key: 'aragon', weight: 1 },
    { color: '#dc2626', key: 'canaryIslands', weight: 1 },
    { color: '#4f46e5', key: 'castileAndLeon', weight: 1 },
    { color: '#ea580c', key: 'navarre', weight: 1 },
    { color: '#059669', key: 'cantabria', weight: 1 },
    { color: '#a8a29e', key: 'unassigned', weight: 1 },
    { color: '#0284c7', key: 'asturias', weight: 1 },
    { color: '#c026d3', key: 'murcia', weight: 1 },
    { color: '#ca8a04', key: 'balearicIslands', weight: 1 },
    { color: '#475569', key: 'madrid', weight: 1 },
    { color: '#65a30d', key: 'castileLaMancha', weight: 1 },
    { color: '#14b8a6', key: 'extremadura', weight: 1 },
    { color: '#e11d48', key: 'laRioja', weight: 1 },
    { color: '#94a3b8', key: 'andorra', weight: 1 },
  ],
} as const;

// Google event-page visits grouped by the saved PostHog insight's event-region
// property (Sep 6–Oct 5, 2026). Values follow the region segment order above.
const regionDailyEventCounts = [
  [609, 34, 40, 32, 25, 28, 39, 7, 3, 11, 8, 19, 10, 19, 10, 2, 7, 4, 5],
  [408, 54, 39, 34, 24, 25, 36, 12, 7, 22, 10, 8, 5, 14, 8, 3, 6, 4, 2],
  [255, 20, 26, 13, 18, 25, 14, 6, 15, 15, 6, 15, 9, 10, 7, 1, 4, 0, 0],
  [253, 30, 37, 10, 12, 19, 20, 11, 12, 21, 6, 4, 17, 3, 6, 5, 8, 6, 0],
  [199, 34, 34, 12, 18, 12, 14, 19, 17, 12, 7, 9, 10, 2, 4, 0, 6, 2, 0],
  [235, 37, 49, 15, 20, 14, 18, 12, 17, 11, 3, 8, 6, 9, 9, 1, 9, 6, 1],
  [234, 60, 66, 40, 27, 23, 18, 33, 28, 15, 12, 21, 9, 20, 3, 1, 7, 8, 5],
  [282, 72, 94, 31, 70, 18, 20, 31, 16, 14, 13, 22, 32, 20, 7, 11, 4, 3, 3],
  [253, 66, 54, 17, 37, 14, 11, 13, 8, 12, 9, 24, 15, 5, 8, 6, 8, 8, 3],
  [309, 59, 55, 38, 35, 20, 15, 43, 20, 21, 8, 11, 14, 12, 2, 8, 12, 3, 2],
  [317, 52, 36, 28, 27, 18, 23, 19, 25, 13, 9, 5, 15, 3, 5, 6, 7, 2, 3],
  [236, 60, 34, 16, 22, 17, 34, 12, 9, 5, 16, 7, 14, 6, 4, 8, 2, 2, 2],
  [403, 65, 40, 38, 29, 22, 54, 14, 8, 18, 18, 26, 9, 17, 7, 9, 3, 6, 0],
  [836, 98, 70, 75, 41, 69, 67, 26, 13, 23, 50, 31, 5, 10, 8, 25, 18, 7, 4],
  [960, 132, 102, 45, 46, 44, 38, 36, 21, 64, 28, 19, 10, 12, 10, 32, 13, 2, 2],
  [384, 139, 86, 40, 38, 30, 52, 37, 33, 26, 15, 21, 14, 16, 9, 8, 10, 5, 6],
  [277, 75, 69, 38, 32, 40, 17, 21, 20, 10, 12, 13, 8, 14, 19, 12, 4, 10, 1],
  [217, 56, 52, 29, 20, 24, 21, 20, 19, 16, 19, 14, 6, 4, 9, 18, 4, 14, 0],
  [222, 62, 55, 28, 22, 25, 17, 18, 9, 13, 12, 26, 3, 3, 8, 11, 15, 24, 5],
  [185, 75, 66, 36, 34, 49, 26, 29, 23, 29, 7, 22, 8, 12, 14, 7, 10, 10, 0],
  [353, 94, 95, 88, 20, 92, 13, 35, 39, 12, 14, 43, 5, 11, 19, 40, 8, 1, 4],
  [471, 124, 144, 56, 53, 81, 17, 27, 29, 31, 18, 19, 14, 26, 35, 46, 19, 6, 3],
  [257, 104, 130, 29, 50, 40, 22, 26, 33, 22, 19, 15, 19, 9, 27, 14, 9, 2, 2],
  [162, 55, 82, 33, 35, 27, 12, 22, 20, 18, 18, 3, 10, 5, 18, 13, 15, 10, 4],
  [149, 60, 51, 27, 38, 21, 19, 18, 20, 10, 23, 7, 10, 11, 14, 10, 16, 6, 0],
  [178, 69, 44, 16, 28, 13, 17, 23, 17, 13, 16, 7, 13, 3, 13, 13, 5, 3, 1],
  [164, 78, 58, 28, 34, 16, 21, 32, 11, 24, 30, 3, 9, 19, 7, 10, 10, 0, 1],
  [220, 122, 94, 54, 32, 37, 16, 64, 33, 35, 42, 9, 43, 57, 7, 4, 5, 4, 2],
  [193, 145, 90, 72, 58, 37, 33, 32, 43, 14, 37, 18, 18, 12, 36, 5, 13, 7, 1],
  [200, 85, 61, 27, 48, 33, 22, 16, 32, 12, 21, 13, 26, 6, 7, 5, 13, 6, 0],
] as const;

const deviceSegments = [
  { color: '#0f766e', key: 'mobile', weight: 66 },
  { color: '#2563eb', key: 'desktop', weight: 33 },
  { color: '#d97706', key: 'tablet', weight: 1 },
] as const;

function getAudienceDistribution(view: AudienceView, dayIndex: number) {
  const segments = audienceSegments[view];

  if (view === 'region') {
    const values = regionDailyEventCounts[dayIndex % regionDailyEventCounts.length];
    const total = values.reduce<number>((sum, value) => sum + value, 0);

    return segments.map((segment, index) => ({
      ...segment,
      percentage: (values[index] / total) * 100,
    }));
  }

  const values = segments.map(({ weight }, index) => Math.max(
    0.05,
    weight + ((dayIndex * (index + 3) + index * 7) % 9 - 4) *
      (weight > 20 ? 0.8 : weight > 5 ? 0.28 : Math.max(weight * 0.15, 0.03)),
  ));
  const total = values.reduce((sum, value) => sum + value, 0);

  return segments.map((segment, index) => ({
    ...segment,
    percentage: (values[index] / total) * 100,
  }));
}

function getDeviceDistribution(dayIndex: number) {
  const values = deviceSegments.map(({ weight }, index) => Math.max(
    0.05,
    weight + ((dayIndex * (index + 2) + index * 5) % 7 - 3) *
      (weight > 20 ? 1.15 : Math.max(weight * 0.14, 0.03)),
  ));
  const total = values.reduce((sum, value) => sum + value, 0);

  return deviceSegments.map((segment, index) => ({
    ...segment,
    percentage: (values[index] / total) * 100,
  }));
}

export const sponsorDashboardMockData: Record<Campaign, SponsorDashboardData> = {
  banner: bannerCampaignData,
  sticky: stickyCampaignData,
};

interface SponsorDashboardProps {
  data?: Record<Campaign, SponsorDashboardData>;
  locale: Locale;
}

function getDaysForPeriod(days: SponsorDashboardDay[], period: ReportingPeriod) {
  if (period === 'last30Days') return days.slice(-30);
  if (period === 'all') return days.filter(({ date }) => date >= ALL_VIEW_START);

  const latest = new Date(`${days.at(-1)?.date}T12:00:00`);
  const month = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - 1, 1));
  const prefix = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;

  return days.filter(({ date }) => date.startsWith(prefix));
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

export function SponsorDashboard({
  data = sponsorDashboardMockData,
  locale,
}: SponsorDashboardProps) {
  const t = useTranslations('sponsorDashboard');
  const [campaign, setCampaign] = useState<Campaign>('banner');
  const [period, setPeriod] = useState<ReportingPeriod>('last30Days');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [audienceView, setAudienceView] = useState<AudienceView>('region');
  const [activeAudienceIndex, setActiveAudienceIndex] = useState<number | null>(null);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState<number | null>(null);
  const days = useMemo(
    () => getDaysForPeriod(data[campaign].dailyImpressions, period),
    [campaign, data, period],
  );
  const impressions = days.reduce((total, day) => total + day.impressions, 0);
  const clicks = days.reduce((total, day) => total + day.clicks, 0);
  const uniqueUsers = days.reduce((total, day) => total + day.uniqueUsers, 0);
  const ctr = impressions === 0 ? 0 : (clicks / impressions) * 100;
  const chart = getChart(days);
  const monthTicks = period === 'all' ? getMonthTicks(days, locale) : [];
  const activeDay = activeIndex === null ? null : days[activeIndex];
  const activeAudienceDay = activeAudienceIndex === null ? null : days[activeAudienceIndex];
  const activeDeviceDay = activeDeviceIndex === null ? null : days[activeDeviceIndex];
  const audienceDistribution = useMemo(
    () => days.map((_, index) => getAudienceDistribution(audienceView, index)),
    [audienceView, days],
  );
  const deviceDistribution = useMemo(
    () => days.map((_, index) => getDeviceDistribution(index)),
    [days],
  );
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
  const metrics = [
    { Icon: Eye, label: t('metrics.impressions'), value: impressions },
    { Icon: MousePointerClick, label: t('metrics.clicks'), value: clicks },
    { Icon: Percent, label: t('metrics.ctr'), value: `${ctr.toFixed(2)}%` },
  ];

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const ratio = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    setActiveIndex(Math.round(ratio * (days.length - 1)));
  };

  const handleAudiencePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const ratio = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    setActiveAudienceIndex(Math.round(ratio * (days.length - 1)));
  };

  const handleDevicePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const ratio = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    setActiveDeviceIndex(Math.round(ratio * (days.length - 1)));
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadSponsorReport({ campaign, locale, period });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-2.5 px-4 md:px-6">
          <Image
            alt={t('navbar.siteName')}
            height={20}
            priority
            src="/assets/web-app-manifest-192x192.png"
            width={20}
          />
          <span className="text-base font-semibold tracking-tight">{t('navbar.siteName')}</span>
          <span className="text-stone-300">/</span>
          <span className="text-sm font-medium text-stone-600">{t('navbar.dashboard')}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {t(`campaign.${campaign}.name`)}
              </h1>
              <p className="mt-1 text-xs font-medium text-stone-500">{t(`campaign.${campaign}.id`)}</p>
            </div>
            <div className="mt-0.5 shrink-0">
              {campaign === 'banner' ? (
                <button
                  aria-label={t('campaign.banner.openPreview')}
                  className="relative block size-8 cursor-pointer overflow-hidden rounded-md border border-stone-200 bg-stone-50 shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Image
                    alt={t('campaign.banner.previewAlt')}
                    className="object-cover object-[25%_28%]"
                    fill
                    sizes="32px"
                    src="/assets/sponsors/trail-brand-banner-preview.png"
                  />
                </button>
              ) : (
                <div
                  aria-hidden="true"
                  className="size-8 rounded-md border border-stone-200 bg-[linear-gradient(145deg,#fafaf9_0%,#e7e5e4_100%)]"
                />
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <label className="relative">
              <span className="sr-only">{t('campaign.label')}</span>
              <select
                className="cursor-pointer appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-stone-700 shadow-sm outline-none transition-colors hover:border-stone-300 focus:border-stone-400"
                value={campaign}
                onChange={(event) => {
                  setCampaign(event.target.value as Campaign);
                  setActiveIndex(null);
                  setIsPreviewOpen(false);
                }}
              >
                <option value="banner">{t('campaign.banner.label')}</option>
                <option value="sticky">{t('campaign.sticky.label')}</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-500" />
            </label>
            <label className="relative">
              <span className="sr-only">{t('period.label')}</span>
              <select
                className="cursor-pointer appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-stone-700 shadow-sm outline-none transition-colors hover:border-stone-300 focus:border-stone-400"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value as ReportingPeriod);
                  setActiveIndex(null);
                }}
              >
                <option value="last30Days">{t('period.last30Days')}</option>
                <option value="lastMonth">{t('period.lastMonth')}</option>
                <option value="all">{t('period.all')}</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-500" />
            </label>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:border-stone-300 disabled:cursor-wait disabled:opacity-70"
              disabled={isDownloading}
              type="button"
              onClick={() => void handleDownload()}
            >
              <Download aria-hidden="true" className="size-3.5" />
              {isDownloading ? t('actions.downloading') : t('actions.downloadReport')}
            </button>
          </div>
        </header>

        <section aria-label={t('metricsLabel')} className="mt-5 grid gap-3 sm:grid-cols-3">
          {metrics.map(({ Icon, label, value }) => (
            <dl key={label} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 shadow-sm">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <span className="grid size-6 place-items-center rounded-full bg-stone-100 text-stone-600">
                  <Icon aria-hidden="true" className="size-3.5" />
                </span>
                {label}
              </dt>
              <dd className="mt-2.5 text-2xl font-semibold tracking-tight md:text-3xl">
                {typeof value === 'number' ? new Intl.NumberFormat(locale).format(value) : value}
              </dd>
            </dl>
          ))}
        </section>

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

        <section className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t('audience.title')}</h2>
              <p className="mt-1 text-xs text-stone-500">{t(`audience.source.${audienceView}`)}</p>
            </div>
            <label className="relative">
              <span className="sr-only">{t('audience.groupBy')}</span>
              <select
                className="cursor-pointer appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-stone-700 shadow-sm outline-none transition-colors hover:border-stone-300 focus:border-stone-400"
                value={audienceView}
                onChange={(event) => {
                  setAudienceView(event.target.value as AudienceView);
                  setActiveAudienceIndex(null);
                }}
              >
                <option value="country">{t('audience.country')}</option>
                <option value="region">{t('audience.region')}</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-500" />
            </label>
          </div>

          <div
            aria-label={t(`audience.summary.${audienceView}`)}
            className="relative mt-4 h-44 border-b border-l border-stone-200 px-2 pb-5 pt-2"
            role="img"
            onPointerLeave={() => setActiveAudienceIndex(null)}
            onPointerMove={handleAudiencePointerMove}
          >
            <div className="absolute inset-x-2 top-2 h-[calc(100%-1.75rem)]">
              <div className="pointer-events-none absolute inset-0 grid grid-rows-4">
                {[0, 1, 2, 3].map((row) => (
                  <span key={row} className="border-t border-dashed border-stone-200/80" />
                ))}
              </div>
              <div className="relative flex h-full items-stretch gap-px">
                {audienceDistribution.map((distribution, index) => (
                  <div
                    key={days[index]?.date}
                    className="flex min-w-0 flex-1 flex-col-reverse overflow-hidden rounded-[2px]"
                  >
                    {distribution.map(({ color, key, percentage }) => (
                      <span
                        key={key}
                        style={{ backgroundColor: color, height: `${percentage}%` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <span className="absolute bottom-0 left-2 text-[10px] tabular-nums text-stone-500">
              {formatDate(days[0]?.date ?? '', locale)}
            </span>
            <span className="absolute bottom-0 right-0 text-[10px] tabular-nums text-stone-500">
              {formatDate(days.at(-1)?.date ?? '', locale)}
            </span>
            <span className="absolute left-2 top-2 text-[10px] font-medium text-stone-500">100%</span>
            {activeAudienceDay && activeAudienceIndex !== null ? (
              <div
                className={`pointer-events-none absolute top-3 z-10 w-48 rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-md ${
                  activeAudienceIndex > days.length * 0.7 ? '-translate-x-full' : ''
                }`}
                style={{ left: `${((activeAudienceIndex + 0.5) / days.length) * 100}%` }}
              >
                <p className="text-stone-500">{formatDate(activeAudienceDay.date, locale)}</p>
                <dl className="mt-2 space-y-1 border-t border-stone-100 pt-2">
                  {audienceDistribution[activeAudienceIndex].map(({ key, percentage }) => (
                    <div key={key} className="flex justify-between gap-3">
                      <dt>{t(`audience.segments.${audienceView}.${key}`)}</dt>
                      <dd>{percentage.toFixed(1)}%</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-medium text-stone-500">
            {audienceSegments[audienceView].map(({ color, key }) => (
              <span key={key} className="flex items-center gap-1.5">
                <i aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />
                {t(`audience.segments.${audienceView}.${key}`)}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm md:p-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t('device.title')}</h2>
            <p className="mt-1 text-xs text-stone-500">{t('device.source')}</p>
          </div>

          <div
            aria-label={t('device.summary')}
            className="relative mt-4 h-44 border-b border-l border-stone-200 px-2 pb-5 pt-2"
            role="img"
            onPointerLeave={() => setActiveDeviceIndex(null)}
            onPointerMove={handleDevicePointerMove}
          >
            <div className="absolute inset-x-2 top-2 h-[calc(100%-1.75rem)]">
              <div className="pointer-events-none absolute inset-0 grid grid-rows-4">
                {[0, 1, 2, 3].map((row) => (
                  <span key={row} className="border-t border-dashed border-stone-200/80" />
                ))}
              </div>
              <div className="relative flex h-full items-stretch gap-px">
                {deviceDistribution.map((distribution, index) => (
                  <div
                    key={days[index]?.date}
                    className="flex min-w-0 flex-1 flex-col-reverse overflow-hidden rounded-[2px]"
                  >
                    {distribution.map(({ color, key, percentage }) => (
                      <span
                        key={key}
                        style={{ backgroundColor: color, height: percentage + '%' }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <span className="absolute bottom-0 left-2 text-[10px] tabular-nums text-stone-500">
              {formatDate(days[0]?.date ?? '', locale)}
            </span>
            <span className="absolute bottom-0 right-0 text-[10px] tabular-nums text-stone-500">
              {formatDate(days.at(-1)?.date ?? '', locale)}
            </span>
            <span className="absolute left-2 top-2 text-[10px] font-medium text-stone-500">100%</span>
            {activeDeviceDay && activeDeviceIndex !== null ? (
              <div
                className={"pointer-events-none absolute top-3 z-10 w-44 rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-md " + (
                  activeDeviceIndex > days.length * 0.7 ? '-translate-x-full' : ''
                )}
                style={{ left: ((activeDeviceIndex + 0.5) / days.length) * 100 + '%' }}
              >
                <p className="text-stone-500">{formatDate(activeDeviceDay.date, locale)}</p>
                <dl className="mt-2 space-y-1 border-t border-stone-100 pt-2">
                  {deviceDistribution[activeDeviceIndex].map(({ key, percentage }) => (
                    <div key={key} className="flex justify-between gap-3">
                      <dt>{t(`device.segments.${key}`)}</dt>
                      <dd>{percentage.toFixed(1)}%</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-medium text-stone-500">
            {deviceSegments.map(({ color, key }) => (
              <span key={key} className="flex items-center gap-1.5">
                <i aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />
                {t(`device.segments.${key}`)}
              </span>
            ))}
          </div>
        </section>
      </div>
      {isPreviewOpen && campaign === 'banner' ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-stone-950/70 p-5 backdrop-blur-sm"
          role="dialog"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-xl border border-white/20 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label={t('campaign.banner.closePreview')}
              className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-stone-950/80 text-white shadow-sm transition-colors hover:bg-stone-950"
              type="button"
              onClick={() => setIsPreviewOpen(false)}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
            <Image
              alt={t('campaign.banner.previewAlt')}
              className="h-auto max-h-[88vh] w-full object-contain"
              height={1672}
              priority
              src="/assets/sponsors/trail-brand-banner-preview.png"
              width={2940}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
