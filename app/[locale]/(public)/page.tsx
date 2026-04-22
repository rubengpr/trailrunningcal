import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import HeroSection from '@/components/layout/hero-section';
import RacesExplorerClient from '@/components/mapa/races-explorer-client';
import {
  getSeoMetaConfig,
  generateMetadataFromOptions,
} from '@/seo/meta-config';
import type { Locale } from '@/i18n';
import { buildHomeAlternateLinks } from '@/lib/alternate-links';
import { getRaces } from '@/lib/db/races';
import { getRacesMapData } from '@/lib/db/races-map';
import {
  buildWebsiteJsonLd,
  buildOrganizationJsonLd,
  buildFaqJsonLd,
} from '@/lib/seo/home-json-ld';
import type { MapPageLabels } from '@/types/map.types';

/** Calendar + map data; map markers benefit from fresher revalidation than static-only home. */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const seoMeta = getSeoMetaConfig('home', locale);

  const year = new Date().getFullYear();
  const title = `${t(seoMeta.titleKey)} ${year}`;
  const description = t(seoMeta.descriptionKey);

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl: seoMeta.canonicalUrl,
    locale,
    ogImageUrl: seoMeta.ogImageUrl,
    ogType: seoMeta.ogType,
    alternateLinks: buildHomeAlternateLinks(),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const [races, { markers }] = await Promise.all([
    getRaces(),
    getRacesMapData(),
  ]);

  const labels: MapPageLabels = {
    previousRace: t('map.previousRace'),
    nextRace: t('map.nextRace'),
    racePageLink: t('map.racePageLink'),
    notAvailable: t('race.notAvailable'),
  };

  const websiteJsonLd = buildWebsiteJsonLd();
  const organizationJsonLd = buildOrganizationJsonLd();
  const faqJsonLd = buildFaqJsonLd([
    { question: t('faq.calendarQ'), answer: t('faq.calendarA') },
    { question: t('faq.typesQ'), answer: t('faq.typesA') },
    { question: t('faq.provincesQ'), answer: t('faq.provincesA') },
    { question: t('faq.addRaceQ'), answer: t('faq.addRaceA') },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroSection
        titleStart={t('landing.titleStart')}
        titlePlace={t('landing.titlePlace')}
        subtitle={t('landing.subtitle')}
        ctaLabel={t('landing.cta')}
      />
      <div id="calendar" className="mx-auto w-full min-w-0 pt-6 pb-16 sm:pt-10 lg:pt-4 scroll-mt-18 sm:scroll-mt-20">
        <RacesExplorerClient
          races={races}
          markers={markers}
          locale={locale}
          labels={labels}
        />
      </div>
    </>
  );
}
