import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { getRaces } from '@/lib/db/races';
import { getRacesMapData } from '@/lib/db/races-map';
import { buildStaticPublicAlternateLinks } from '@/lib/content/alternate-links';
import { generateMetadataFromOptions } from '@/lib/seo/meta-config';
import type { MapPageLabels, RaceMapMarker } from '@/types/map.types';
import type { TrailRace } from '@/types/race.types';

export interface CategoryPageData {
  allRaces: TrailRace[];
  markers: RaceMapMarker[];
  labels: MapPageLabels;
  calendarLabel: string;
  year: number;
}

interface CategoryMetadataOptions {
  locale: Locale;
  namespace: string;
  slug: string;
}

export async function generateCategoryMetadata({
  locale,
  namespace,
  slug,
}: CategoryMetadataOptions): Promise<Metadata> {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace });
  const year = new Date().getFullYear();

  return generateMetadataFromOptions({
    title: t('pageTitle', { year }),
    description: t('pageDescription', { year }),
    canonicalUrl: `${BASE_URL}/${locale}/${slug}`,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildStaticPublicAlternateLinks(slug),
  });
}

export async function getCategoryPageData(locale: Locale): Promise<CategoryPageData> {
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tCommon = await getTranslations({ locale });
  const year = new Date().getFullYear();
  const [allRaces, { markers }] = await Promise.all([getRaces(), getRacesMapData()]);

  const labels: MapPageLabels = {
    previousRace: tCommon('map.previousRace'),
    nextRace: tCommon('map.nextRace'),
    racePageLink: tCommon('map.racePageLink'),
    notAvailable: tCommon('race.notAvailable'),
  };

  return { allRaces, markers, labels, calendarLabel: tNav('calendar'), year };
}
