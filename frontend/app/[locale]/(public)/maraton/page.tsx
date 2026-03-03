import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '../../../../i18n';
import { getRaces } from '@/lib/db/races';
import { generateMetadataFromOptions } from '../../../../seo/meta-config';
import { buildMaratonAlternateLinks } from '../../../../lib/alternate-links';
import { BASE_URL } from '../../../../lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import CategoryHeroSection from '../../../../components/category-hero-section';
import HomeClient from '../../../../components/home-client';

export const revalidate = 300; // 5 minutes

const DISTANCE_MIN = 40;
const DISTANCE_MAX = 50;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'maraton' });
  const year = new Date().getFullYear();
  const title = t('pageTitle', { year });
  const description = t('pageDescription', { year });
  const canonicalUrl = `${BASE_URL}/${locale}/maraton`;

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildMaratonAlternateLinks(),
  });
}

export default async function MaratonPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'maraton' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const year = new Date().getFullYear();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/maraton` },
  ]);

  const allRaces = await getRaces();
  const maratonRaces = allRaces.filter(
    (race) => race.distanceKm >= DISTANCE_MIN && race.distanceKm < DISTANCE_MAX,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoryHeroSection
        title={t('pageTitle', { year })}
        description={t('pageDescription', { year })}
        body={t('pageBody')}
        breadcrumb={t('breadcrumb')}
      />
      <HomeClient races={maratonRaces} showProvinceFilter={false} />
    </>
  );
}
