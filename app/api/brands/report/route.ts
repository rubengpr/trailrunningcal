import { NextResponse } from 'next/server';
import { createSponsorReport } from '@/lib/services/sponsor-report';
import type { SponsorCampaign, SponsorReportingPeriod } from '@/lib/sponsors/report-data';

const campaigns = new Set<SponsorCampaign>(['banner', 'sticky']);
const periods = new Set<SponsorReportingPeriod>(['last30Days', 'lastMonth', 'all']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaign = searchParams.get('campaign');
  const period = searchParams.get('period');

  if (!campaigns.has(campaign as SponsorCampaign) || !periods.has(period as SponsorReportingPeriod)) {
    return NextResponse.json({ error: 'Invalid report parameters' }, { status: 400 });
  }

  try {
    const pdf = await createSponsorReport({
      campaign: campaign as SponsorCampaign,
      period: period as SponsorReportingPeriod,
    });
    const filename = `${campaign}-${period}-report.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/pdf',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to generate report' }, { status: 500 });
  }
}
