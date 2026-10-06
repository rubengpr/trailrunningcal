import type { Locale } from '@/i18n';
import type { SponsorCampaign, SponsorReportingPeriod } from '@/lib/sponsors/report-data';

export async function downloadSponsorReport({
  campaign,
  locale,
  period,
}: {
  campaign: SponsorCampaign;
  locale: Locale;
  period: SponsorReportingPeriod;
}) {
  const query = new URLSearchParams({ campaign, locale, period });
  const response = await fetch(`/api/brands/report?${query.toString()}`);
  if (!response.ok) throw new Error('Unable to download report');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${campaign}-${period}-report.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
