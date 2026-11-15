export type ReportingPeriod = 'last30Days' | 'lastMonth' | 'all';

export interface SponsorDashboardDay {
  date: string;
  clicks: number;
  impressions: number;
  uniqueUsers: number;
}

export interface SponsorDashboardData {
  dailyImpressions: SponsorDashboardDay[];
}
