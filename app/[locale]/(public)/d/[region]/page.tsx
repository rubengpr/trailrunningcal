import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateMetadataFromOptions } from '@/lib/seo/meta-config';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import {
  getCategoryPageData,
  translateWithOverride,
} from '@/lib/content/category-page';
import {
  buildDestinationAlternateLinks,
  buildRegionAlternateLinks,
  getDestinationPath,
  getRegionBySlug,
  getRegionPath,
  getRegionProvinceIds,
  getSingleProvinceId,
  GEOGRAPHY,
} from '@/lib/geography/destinations';

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; region: string }>;
}): Promise<Metadata> {
  const { locale, region } = await params;
  setRequestLocale(locale);

  const regionMatch = getRegionBySlug(region);

  if (!regionMatch) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'comunidad' });
  const tGeography = await getTranslations({
    locale,
    namespace: 'geography.regions',
  });
  const regionName = tGeography(regionMatch.id);
  const year = new Date().getFullYear();

  // Single-province communities list exactly the same races as their province
  // page, so they point every indexing signal at it instead of competing.
  const singleProvinceId = getSingleProvinceId(regionMatch.id);

  return generateMetadataFromOptions({
    title: t('pageTitle', { region: regionName, year }),
    description: translateWithOverride(
      t,
      `pageDescriptions.${regionMatch.id}`,
      'pageDescription',
      { region: regionName, year },
    ),
    canonicalUrl: singleProvinceId
      ? `${BASE_URL}${getDestinationPath(locale, regionMatch.id, singleProvinceId)}`
      : `${BASE_URL}${getRegionPath(locale, regionMatch.id)}`,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: singleProvinceId
      ? buildDestinationAlternateLinks(regionMatch.id, singleProvinceId)
      : buildRegionAlternateLinks(regionMatch.id),
  });
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ locale: Locale; region: string }>;
}) {
  const { locale, region } = await params;
  setRequestLocale(locale);

  const regionMatch = getRegionBySlug(region);

  if (!regionMatch) {
    notFound();
  }

  const provinceIds = getRegionProvinceIds(regionMatch.id);
  const scope = {
    provinces: provinceIds.map(
      (provinceId) => GEOGRAPHY.provinces[provinceId].dbName,
    ),
  };
  const { eventsPage, labels, calendarLabel } = await getCategoryPageData(
    locale,
    scope,
  );
  const [t, tGeography, tProvince] = await Promise.all([
    getTranslations({ locale, namespace: 'comunidad' }),
    getTranslations({ locale, namespace: 'geography.regions' }),
    getTranslations({ locale, namespace: 'provincia.names' }),
  ]);
  const regionName = tGeography(regionMatch.id);
  const regionPath = getRegionPath(locale, regionMatch.id);

  return (
    <CategoryMapPage
      locale={locale}
      initialPage={eventsPage}
      scope={scope}
      breadcrumbJsonLd={buildBreadcrumbJsonLd([
        { name: calendarLabel, url: `${BASE_URL}/${locale}` },
        { name: regionName, url: `${BASE_URL}${regionPath}` },
      ])}
      heroBody={t('pageBody', { region: regionName })}
      heroTitleStart={t('heroTitleStart')}
      heroTitlePlace={regionName}
      heroSubtitle={translateWithOverride(
        t,
        `heroSubtitles.${regionMatch.id}`,
        'heroSubtitle',
        { region: regionName },
      )}
      breadcrumbItems={[
        { name: calendarLabel, href: `/${locale}` },
        { name: regionName },
      ]}
      labels={labels}
      regionId={regionMatch.id}
      showProvinceFilter={provinceIds.length > 1}
      showDistanceFilter={true}
      childLinksHeading={t('provincesHeading', { region: regionName })}
      childLinks={provinceIds.map((provinceId) => ({
        name: tProvince(provinceId),
        href: getDestinationPath(locale, regionMatch.id, provinceId),
      }))}
    />
  );
}
