import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateMetadataFromOptions } from '@/seo/meta-config';
import { buildMaratonAlternateLinks } from '@/lib/alternate-links';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { getCategoryPageData } from '@/lib/category-page';

export const revalidate = 300;

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

  return generateMetadataFromOptions({
    title: t('pageTitle', { year }),
    description: t('pageDescription', { year }),
    canonicalUrl: `${BASE_URL}/${locale}/maraton`,
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
  const { allRaces, markers, labels, calendarLabel, year } = await getCategoryPageData(locale);
  const t = await getTranslations({ locale, namespace: 'maraton' });

  const races = allRaces.filter(
    (race) => race.distanceKm >= DISTANCE_MIN && race.distanceKm < DISTANCE_MAX,
  );

  return (
    <CategoryMapPage
      locale={locale}
      races={races}
      markers={markers}
      breadcrumbJsonLd={buildBreadcrumbJsonLd([
        { name: calendarLabel, url: `${BASE_URL}/${locale}` },
        { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/maraton` },
      ])}
      heroTitle={t('pageTitle', { year })}
      heroBody={t('pageBody')}
      breadcrumbItems={[
        { name: calendarLabel, href: `/${locale}` },
        { name: t('breadcrumb') },
      ]}
      labels={labels}
    />
  );
}
