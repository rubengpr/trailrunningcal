import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateMetadataFromOptions } from '@/seo/meta-config';
import { buildKmVerticalAlternateLinks } from '@/lib/alternate-links';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { getCategoryPageData } from '@/lib/category-page';
import type { FaqItem } from '@/lib/seo/faq-json-ld';

export const revalidate = 300;

const VK_KEYWORDS = ['kilómetro vertical', 'quilòmetre vertical', 'km vertical'];
const VK_DISTANCE_MAX = 4;
const VK_ELEVATION_MIN = 600;

function isVkRace(name: string, distanceKm: number, elevationGainM: number | null): boolean {
  const lowerName = name.toLowerCase();
  const hasKeyword =
    VK_KEYWORDS.some((kw) => lowerName.includes(kw)) ||
    lowerName.includes(' kv ') ||
    lowerName.startsWith('kv ') ||
    lowerName.endsWith(' kv');
  const hasRatio = distanceKm < VK_DISTANCE_MAX && elevationGainM !== null && elevationGainM >= VK_ELEVATION_MIN;
  return hasKeyword || hasRatio;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'kmVertical' });
  const year = new Date().getFullYear();

  return generateMetadataFromOptions({
    title: t('pageTitle', { year }),
    description: t('pageDescription', { year }),
    canonicalUrl: `${BASE_URL}/${locale}/km-vertical`,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildKmVerticalAlternateLinks(),
  });
}

export default async function KmVerticalPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const { allRaces, markers, labels, calendarLabel, year } = await getCategoryPageData(locale);
  const t = await getTranslations({ locale, namespace: 'kmVertical' });

  const races = allRaces.filter((race) =>
    isVkRace(race.name, race.distanceKm, race.elevationGainM),
  );

  const contentSections = Object.values(
    t.raw('contentSections') as Record<string, FaqItem>
  );

  return (
    <CategoryMapPage
      locale={locale}
      races={races}
      markers={markers}
      breadcrumbJsonLd={buildBreadcrumbJsonLd([
        { name: calendarLabel, url: `${BASE_URL}/${locale}` },
        { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/km-vertical` },
      ])}
      heroTitle={t('pageTitle', { year })}
      heroBody={t('pageBody')}
      heroTitleStart={t('titleStart')}
      heroTitlePlace={t('titlePlace')}
      heroSubtitle={t('heroSubtitle')}
      breadcrumbItems={[
        { name: calendarLabel, href: `/${locale}` },
        { name: t('breadcrumb') },
      ]}
      labels={labels}
      contentSections={contentSections}
      contentSectionsHeading={t('contentSectionsTitle')}
    />
  );
}
