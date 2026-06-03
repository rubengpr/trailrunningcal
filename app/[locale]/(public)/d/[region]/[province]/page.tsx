import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateMetadataFromOptions } from '@/lib/seo/meta-config';
import { buildDestinationAlternateLinks } from '@/lib/geography/destinations';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { getCategoryPageData } from '@/lib/content/category-page';
import {
  getDestinationBySlugs,
  getDestinationPath,
} from '@/lib/geography/destinations';

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; region: string; province: string }>;
}): Promise<Metadata> {
  const { locale, region, province } = await params;
  setRequestLocale(locale);

  const destination = getDestinationBySlugs(region, province);

  if (!destination) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'provincia' });
  const provinceName = t(`names.${destination.province.slug}`);
  const year = new Date().getFullYear();

  return generateMetadataFromOptions({
    title: t('pageTitle', { province: provinceName, year }),
    description: t(`pageDescriptions.${destination.province.slug}`, { year }),
    canonicalUrl: `${BASE_URL}${getDestinationPath(
      locale,
      destination.regionId,
      destination.provinceId,
    )}`,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildDestinationAlternateLinks(
      destination.regionId,
      destination.provinceId,
    ),
  });
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ locale: Locale; region: string; province: string }>;
}) {
  const { locale, region, province } = await params;
  setRequestLocale(locale);

  const destination = getDestinationBySlugs(region, province);

  if (!destination) {
    notFound();
  }

  const { events, markers, labels, calendarLabel } = await getCategoryPageData(locale);
  const t = await getTranslations({ locale, namespace: 'provincia' });
  const provinceName = t(`names.${destination.province.slug}`);
  const destinationPath = getDestinationPath(
    locale,
    destination.regionId,
    destination.provinceId,
  );

  const destinationEvents = events.filter(
    (eventDetail) =>
      !eventDetail.location.isMultipleLocations &&
      eventDetail.location.province === destination.province.dbName,
  );

  return (
    <CategoryMapPage
      locale={locale}
      events={destinationEvents}
      markers={markers}
      breadcrumbJsonLd={buildBreadcrumbJsonLd([
        { name: calendarLabel, url: `${BASE_URL}/${locale}` },
        { name: provinceName, url: `${BASE_URL}${destinationPath}` },
      ])}
      heroBody={t('pageBody', { province: provinceName })}
      heroTitleStart={t('heroTitleStart')}
      heroTitlePlace={provinceName}
      heroSubtitle={t(`heroSubtitles.${destination.province.slug}`)}
      breadcrumbItems={[
        { name: calendarLabel, href: `/${locale}` },
        { name: provinceName },
      ]}
      labels={labels}
      showProvinceFilter={false}
      showDistanceFilter={true}
    />
  );
}
