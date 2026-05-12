import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateMetadataFromOptions } from '@/lib/seo/meta-config';
import { buildProvinceAlternateLinks } from '@/lib/content/alternate-links';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { getCategoryPageData } from '@/lib/content/category-page';
import { PROVINCE_SLUGS, type ProvinceSlug } from '@/lib/constants';

export const revalidate = 86400;

const PROVINCE_DB_NAMES: Record<ProvinceSlug, string> = {
  barcelona: 'Barcelona',
  girona: 'Girona',
  lleida: 'Lleida',
  tarragona: 'Tarragona',
};

function isValidProvince(value: string): value is ProvinceSlug {
  return PROVINCE_SLUGS.includes(value as ProvinceSlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; province: string }>;
}): Promise<Metadata> {
  const { locale, province } = await params;
  setRequestLocale(locale);

  if (!isValidProvince(province)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'provincia' });
  const provinceName = t(`names.${province}`);
  const year = new Date().getFullYear();

  return generateMetadataFromOptions({
    title: t('pageTitle', { province: provinceName, year }),
    description: t(`pageDescriptions.${province}`, { year }),
    canonicalUrl: `${BASE_URL}/${locale}/provincia/${province}`,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildProvinceAlternateLinks(province),
  });
}

export default async function ProvincePage({
  params,
}: {
  params: Promise<{ locale: Locale; province: string }>;
}) {
  const { locale, province } = await params;
  setRequestLocale(locale);

  if (!isValidProvince(province)) {
    notFound();
  }

  const { allRaces, markers, labels, calendarLabel, year } = await getCategoryPageData(locale);
  const t = await getTranslations({ locale, namespace: 'provincia' });
  const provinceName = t(`names.${province}`);

  const races = allRaces.filter(
    (race) => race.province === PROVINCE_DB_NAMES[province],
  );

  return (
    <CategoryMapPage
      locale={locale}
      races={races}
      markers={markers}
      breadcrumbJsonLd={buildBreadcrumbJsonLd([
        { name: calendarLabel, url: `${BASE_URL}/${locale}` },
        { name: provinceName, url: `${BASE_URL}/${locale}/provincia/${province}` },
      ])}
      heroBody={t('pageBody', { province: provinceName })}
      heroTitleStart={t('heroTitleStart')}
      heroTitlePlace={provinceName}
      heroSubtitle={t(`heroSubtitles.${province}`)}
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
