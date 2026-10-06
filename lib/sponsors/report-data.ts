export type SponsorCampaign = 'banner' | 'sticky';
export type SponsorReportingPeriod = 'last30Days' | 'lastMonth' | 'all';

export interface SponsorReportDay {
  date: string;
  clicks: number;
  impressions: number;
}

const ALL_VIEW_START = '2026-01-01';

function buildHistoricalDays(): SponsorReportDay[] {
  const days: SponsorReportDay[] = [];
  const end = new Date('2026-08-07T12:00:00Z');

  for (let current = new Date(`${ALL_VIEW_START}T12:00:00Z`), index = 0; current <= end; index += 1) {
    const isWeekend = current.getUTCDay() === 0 || current.getUTCDay() === 6;
    const impressions = Math.round((150 + (index % 11) * 14 + Math.floor(index / 31) * 20) * (isWeekend ? 1.18 : 1));
    days.push({
      date: current.toISOString().slice(0, 10),
      impressions,
      clicks: Math.max(1, Math.round(impressions * (0.0105 + (index % 3) * 0.0008))),
    });
    current = new Date(current.getTime() + 86_400_000);
  }

  return days;
}

const bannerDays: SponsorReportDay[] = [
  ...buildHistoricalDays(),
  { date: '2026-08-08', impressions: 543, clicks: 7 }, { date: '2026-08-09', impressions: 512, clicks: 6 },
  { date: '2026-08-10', impressions: 359, clicks: 4 }, { date: '2026-08-11', impressions: 341, clicks: 4 },
  { date: '2026-08-12', impressions: 354, clicks: 4 }, { date: '2026-08-13', impressions: 376, clicks: 5 },
  { date: '2026-08-14', impressions: 455, clicks: 5 }, { date: '2026-08-15', impressions: 604, clicks: 7 },
  { date: '2026-08-16', impressions: 560, clicks: 7 }, { date: '2026-08-17', impressions: 368, clicks: 4 },
  { date: '2026-08-18', impressions: 350, clicks: 4 }, { date: '2026-08-19', impressions: 363, clicks: 4 },
  { date: '2026-08-20', impressions: 389, clicks: 5 }, { date: '2026-08-21', impressions: 490, clicks: 6 },
  { date: '2026-08-22', impressions: 643, clicks: 8 }, { date: '2026-08-23', impressions: 595, clicks: 7 },
  { date: '2026-08-24', impressions: 398, clicks: 5 }, { date: '2026-08-25', impressions: 376, clicks: 5 },
  { date: '2026-08-26', impressions: 389, clicks: 5 }, { date: '2026-08-27', impressions: 420, clicks: 5 },
  { date: '2026-08-28', impressions: 534, clicks: 6 }, { date: '2026-08-29', impressions: 718, clicks: 9 },
  { date: '2026-08-30', impressions: 665, clicks: 8 }, { date: '2026-08-31', impressions: 420, clicks: 5 },
  { date: '2026-09-01', impressions: 398, clicks: 5 }, { date: '2026-09-02', impressions: 411, clicks: 5 },
  { date: '2026-09-03', impressions: 446, clicks: 5 }, { date: '2026-09-04', impressions: 573, clicks: 7 },
  { date: '2026-09-05', impressions: 779, clicks: 9 }, { date: '2026-09-06', impressions: 713, clicks: 9 },
  { date: '2026-09-07', impressions: 455, clicks: 5 },
];

export const sponsorReportData: Record<SponsorCampaign, SponsorReportDay[]> = {
  banner: bannerDays,
  sticky: bannerDays.map((day, index) => ({
    date: day.date,
    impressions: Math.round(day.impressions * (0.38 + (index % 4) * 0.03)),
    clicks: Math.max(1, Math.round(day.clicks * (0.45 + (index % 3) * 0.05))),
  })),
};

export function getReportDays(campaign: SponsorCampaign, period: SponsorReportingPeriod) {
  const days = sponsorReportData[campaign];
  if (period === 'last30Days') return days.slice(-30);
  if (period === 'all') return days.filter(({ date }) => date >= ALL_VIEW_START);

  const latest = new Date(`${days.at(-1)?.date}T12:00:00Z`);
  const prefix = `${latest.getUTCFullYear()}-${String(latest.getUTCMonth()).padStart(2, '0')}`;
  return days.filter(({ date }) => date.startsWith(prefix));
}

export function getReportTotals(days: SponsorReportDay[]) {
  const impressions = days.reduce((total, day) => total + day.impressions, 0);
  const clicks = days.reduce((total, day) => total + day.clicks, 0);
  return { impressions, clicks, ctr: impressions === 0 ? 0 : (clicks / impressions) * 100 };
}
