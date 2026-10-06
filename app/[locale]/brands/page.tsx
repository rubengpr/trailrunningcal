import { SponsorDashboard } from '@/components/sponsors/sponsor-dashboard';
import type { Locale } from '@/i18n';

export default async function BrandsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return <SponsorDashboard locale={locale} />;
}
