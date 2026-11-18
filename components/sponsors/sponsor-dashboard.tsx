'use client';

import { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  MousePointerClick,
  Percent,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import { SponsorPerformanceChart } from '@/components/sponsors/sponsor-performance-chart';
import type { ReportingPeriod, SponsorDashboardData, SponsorDashboardDay } from '@/types/sponsor-dashboard.types';
import { DashboardSelect } from '@/components/sponsors/dashboard-select';
import { DistributionChart } from '@/components/sponsors/distribution-chart';
import { downloadSponsorReport } from '@/lib/api/sponsor-report';

const ALL_VIEW_START = '2026-01-01';

type Campaign = 'banner' | 'sticky';
type AudienceView = 'country' | 'region';
type BreakdownView = 'audience' | 'device';

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

export function SponsorDashboard({
  data = sponsorDashboardMockData,
  locale,
}: SponsorDashboardProps) {
  const t = useTranslations('sponsorDashboard');
  const [campaign, setCampaign] = useState<Campaign>('banner');
  const [period, setPeriod] = useState<ReportingPeriod>('last30Days');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [audienceView, setAudienceView] = useState<AudienceView>('region');
  const [breakdownView, setBreakdownView] = useState<BreakdownView>('audience');
  const days = useMemo(
    () => getDaysForPeriod(data[campaign].dailyImpressions, period),
    [campaign, data, period],
  );
  const impressions = days.reduce((total, day) => total + day.impressions, 0);
  const clicks = days.reduce((total, day) => total + day.clicks, 0);
  const ctr = impressions === 0 ? 0 : (clicks / impressions) * 100;
  const audienceDistribution = useMemo(
    () => days.map((_, index) => getAudienceDistribution(audienceView, index)),
    [audienceView, days],
  );
  const deviceDistribution = useMemo(
    () => days.map((_, index) => getDeviceDistribution(index)),
    [days],
  );
  const pieDistribution = useMemo(() => {
    if (breakdownView === 'audience') {
      return audienceSegments[audienceView].map((segment, index) => ({
        ...segment,
        percentage: audienceDistribution.reduce(
          (total, distribution) => total + distribution[index].percentage,
          0,
        ) / audienceDistribution.length,
      }));
    }

    return deviceSegments.map((segment, index) => ({
      ...segment,
      percentage: deviceDistribution.reduce(
        (total, distribution) => total + distribution[index].percentage,
        0,
      ) / deviceDistribution.length,
    }));
  }, [audienceDistribution, audienceView, breakdownView, deviceDistribution]);
  const pieGradient = useMemo(() => {
    let start = 0;
    const stops = pieDistribution.map(({ color, percentage }) => {
      const end = start + percentage;
      const stop = `${color} ${start}% ${end}%`;
      start = end;
      return stop;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }, [pieDistribution]);
  const metrics = [
    { Icon: Eye, label: t('metrics.impressions'), value: impressions },
    { Icon: MousePointerClick, label: t('metrics.clicks'), value: clicks },
    { Icon: Percent, label: t('metrics.ctr'), value: `${ctr.toFixed(2)}%` },
  ];

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
            <DashboardSelect
              label={t('campaign.label')}
              value={campaign}
              onChange={(value) => {
                setCampaign(value);
                setIsPreviewOpen(false);
              }}
              options={[
                { value: 'banner', label: t('campaign.banner.label') },
                { value: 'sticky', label: t('campaign.sticky.label') },
              ]}
            />
            <DashboardSelect
              label={t('period.label')}
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'last30Days', label: t('period.last30Days') },
                { value: 'lastMonth', label: t('period.lastMonth') },
                { value: 'all', label: t('period.all') },
              ]}
            />
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

        <SponsorPerformanceChart
          key={`${campaign}-${period}`}
          days={days}
          locale={locale}
          period={period}
        />

        <section className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t('audience.title')}</h2>
              <p className="mt-1 text-xs text-stone-500">{t(`audience.source.${audienceView}`)}</p>
            </div>
            <DashboardSelect
              label={t('audience.groupBy')}
              value={audienceView}
              onChange={setAudienceView}
              options={[
                { value: 'country', label: t('audience.country') },
                { value: 'region', label: t('audience.region') },
              ]}
            />
          </div>

          <DistributionChart
            key={audienceView}
            days={days}
            distributions={audienceDistribution}
            segments={audienceSegments[audienceView].map((segment) => ({
              ...segment,
              label: t(`audience.segments.${audienceView}.${segment.key}`),
            }))}
            summary={t(`audience.summary.${audienceView}`)}
            locale={locale}
            tooltipWidth="wide"
          />
        </section>

        <section className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm md:p-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t('device.title')}</h2>
            <p className="mt-1 text-xs text-stone-500">{t('device.source')}</p>
          </div>

          <DistributionChart
            days={days}
            distributions={deviceDistribution}
            segments={deviceSegments.map((segment) => ({
              ...segment,
              label: t(`device.segments.${segment.key}`),
            }))}
            summary={t('device.summary')}
            locale={locale}
          />
        </section>

        <section className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t('breakdown.title')}</h2>
              <p className="mt-1 text-xs text-stone-500">{t('breakdown.summary')}</p>
            </div>
            <DashboardSelect
              label={t('breakdown.view')}
              value={breakdownView}
              onChange={setBreakdownView}
              options={[
                { value: 'audience', label: t('breakdown.audience') },
                { value: 'device', label: t('breakdown.device') },
              ]}
            />
          </div>

          <div className="mt-4 grid items-center gap-5 sm:grid-cols-[10rem_1fr]">
            <div
              aria-label={t('breakdown.chartSummary', { view: t(`breakdown.${breakdownView}`) })}
              className="relative mx-auto size-40 rounded-full"
              role="img"
              style={{ background: pieGradient }}
            >
              <div className="absolute inset-[29%] grid place-items-center rounded-full bg-stone-50 text-center shadow-[0_0_0_1px_rgba(231,229,228,0.9)]">
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">{t('breakdown.total')}</span>
                <span className="text-sm font-semibold tabular-nums text-stone-900">100%</span>
              </div>
            </div>
            <div className="grid gap-x-4 gap-y-2 text-xs text-stone-600 sm:grid-cols-2">
              {pieDistribution.map(({ color, key, percentage }) => (
                <div key={key} className="flex min-w-0 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <i aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate">
                      {breakdownView === 'audience'
                        ? t(`audience.segments.${audienceView}.${key}`)
                        : t(`device.segments.${key}`)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-stone-500">{percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      {isPreviewOpen && campaign === 'banner' ? (
        <ImagePreviewModal
          src="/assets/sponsors/trail-brand-banner-preview.png"
          alt={t('campaign.banner.previewAlt')}
          title={t('campaign.banner.openPreview')}
          closeLabel={t('campaign.banner.closePreview')}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
    </main>
  );
}
