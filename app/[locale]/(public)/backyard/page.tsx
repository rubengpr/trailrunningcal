import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { getRaces } from '@/lib/db/races';
import { generateMetadataFromOptions } from '@/seo/meta-config';
import { buildBackyardAlternateLinks } from '@/lib/alternate-links';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import CategoryHeroSection from '@/components/layout/category-hero-section';
import MapaCalendarMapClient from '@/components/mapa/mapa-calendar-map-client';
import { getRacesMapData } from '@/lib/db/races-map';
import type { MapPageLabels } from '@/types/map.types';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'backyard' });
  const year = new Date().getFullYear();
  const title = t('pageTitle', { year });
  const description = t('pageDescription', { year });
  const canonicalUrl = `${BASE_URL}/${locale}/backyard`;

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildBackyardAlternateLinks(),
  });
}

export default async function BackyardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'backyard' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tCommon = await getTranslations({ locale });
  const year = new Date().getFullYear();

  const labels: MapPageLabels = {
    previousRace: tCommon('map.previousRace'),
    nextRace: tCommon('map.nextRace'),
    racePageLink: tCommon('map.racePageLink'),
    notAvailable: tCommon('race.notAvailable'),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/backyard` },
  ]);

  const [allRaces, { markers }] = await Promise.all([getRaces(), getRacesMapData()]);
  const backyardRaces = allRaces.filter((race) => race.name.toLowerCase().includes('backyard'));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoryHeroSection
        title={t('pageTitle', { year })}
        body={t('pageBody')}
        breadcrumbItems={[
          { name: tNav('calendar'), href: `/${locale}` },
          { name: t('breadcrumb') },
        ]}
      />
      <div className="mx-auto w-full pt-6 pb-16 sm:pt-10 lg:pt-4">
        <MapaCalendarMapClient
          races={backyardRaces}
          markers={markers}
          locale={locale}
          labels={labels}
          showProvinceFilter={false}
        />
      </div>
    </>
  );
}
