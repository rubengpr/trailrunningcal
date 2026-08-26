import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateMetadataFromOptions } from '@/lib/seo/meta-config';
import { buildDestinationAlternateLinks } from '@/lib/geography/destinations';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import {
  getCategoryPageData,
  translateWithOverride,
} from '@/lib/content/category-page';
import {
  getDestinationBySlugs,
  getDestinationPath,
  getRegionPath,
  getSingleProvinceId,
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
  const provinceName = t(`names.${destination.provinceId}`);
  const year = new Date().getFullYear();

  return generateMetadataFromOptions({
    title: t('pageTitle', { province: provinceName, year }),
    description: translateWithOverride(
      t,
      `pageDescriptions.${destination.provinceId}`,
      'pageDescription',
      { province: provinceName, year },
    ),
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

  const scope = { province: destination.province.dbName };
  const { eventsPage, labels, calendarLabel } = await getCategoryPageData(
    locale,
    scope,
  );
  const [t, tGeography] = await Promise.all([
    getTranslations({ locale, namespace: 'provincia' }),
    getTranslations({ locale, namespace: 'geography.regions' }),
  ]);
  const provinceName = t(`names.${destination.provinceId}`);
  const destinationPath = getDestinationPath(
    locale,
    destination.regionId,
    destination.provinceId,
  );
  // Single-province communities canonicalise to this page, so linking up to
  // them would point the breadcrumb at a URL that redirects the signal back.
  const regionCrumb = getSingleProvinceId(destination.regionId)
    ? null
    : {
        name: tGeography(destination.regionId),
        path: getRegionPath(locale, destination.regionId),
      };

  return (
    <CategoryMapPage
      locale={locale}
      initialPage={eventsPage}
      scope={scope}
      breadcrumbJsonLd={buildBreadcrumbJsonLd([
        { name: calendarLabel, url: `${BASE_URL}/${locale}` },
        ...(regionCrumb
          ? [{ name: regionCrumb.name, url: `${BASE_URL}${regionCrumb.path}` }]
          : []),
        { name: provinceName, url: `${BASE_URL}${destinationPath}` },
      ])}
      heroBody={t('pageBody', { province: provinceName })}
      heroTitleStart={t('heroTitleStart')}
      heroTitlePlace={provinceName}
      heroSubtitle={translateWithOverride(
        t,
        `heroSubtitles.${destination.provinceId}`,
        'heroSubtitle',
        { province: provinceName },
      )}
      breadcrumbItems={[
        { name: calendarLabel, href: `/${locale}` },
        ...(regionCrumb
          ? [{ name: regionCrumb.name, href: regionCrumb.path }]
          : []),
        { name: provinceName },
      ]}
      labels={labels}
      showProvinceFilter={false}
      showDistanceFilter={true}
    />
  );
}
