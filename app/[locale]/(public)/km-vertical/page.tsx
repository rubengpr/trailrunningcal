import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { generateCategoryMetadata, getCategoryPageData } from '@/lib/content/category-page';
import type { FaqItem } from '@/lib/seo/json-ld';

export const revalidate = 86400;

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

export const generateMetadata = (props: { params: Promise<{ locale: Locale }> }) =>
  generateCategoryMetadata({ ...props, namespace: 'kmVertical', slug: 'km-vertical' });

export default async function KmVerticalPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
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
