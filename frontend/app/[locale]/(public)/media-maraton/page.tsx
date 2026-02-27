import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '../../../../i18n';
import { getRaces } from '@/lib/db/races';
import { generateMetadataFromOptions } from '../../../../seo/meta-config';
import { buildMediaMaratonAlternateLinks } from '../../../../lib/alternate-links';
import { BASE_URL } from '../../../../lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import CategoryHeroSection from '../../../../components/category-hero-section';
import HomeClient from '../../../../components/home-client';

export const dynamic = 'force-dynamic';

const DISTANCE_MIN = 20;
const DISTANCE_MAX = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'mediaMaraton' });
  const year = new Date().getFullYear();
  const title = t('pageTitle', { year });
  const description = t('pageDescription', { year });
  const canonicalUrl = `${BASE_URL}/${locale}/media-maraton`;

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildMediaMaratonAlternateLinks(),
  });
}

export default async function MediaMaratonPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'mediaMaraton' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const year = new Date().getFullYear();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/media-maraton` },
  ]);

  const allRaces = await getRaces();
  const halfMarathonRaces = allRaces.filter(
    (race) => race.distanceKm >= DISTANCE_MIN && race.distanceKm <= DISTANCE_MAX,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoryHeroSection
        title={t('pageTitle', { year })}
        subtitle={t('pageSubtitle')}
        description={t('pageDescription', { year })}
        breadcrumb={t('breadcrumb')}
      />
      <HomeClient races={halfMarathonRaces} showProvinceFilter={false} />
    </>
  );
}
