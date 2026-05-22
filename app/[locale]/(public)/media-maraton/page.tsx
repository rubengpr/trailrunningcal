import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { generateCategoryMetadata, getCategoryPageData } from '@/lib/content/category-page';
import type { FaqItem } from '@/lib/seo/json-ld';

export const revalidate = 86400;

const DISTANCE_MIN = 20;
const DISTANCE_MAX = 24;

export const generateMetadata = (props: { params: Promise<{ locale: Locale }> }) =>
  generateCategoryMetadata({ ...props, namespace: 'mediaMaraton', slug: 'media-maraton' });

export default async function MediaMaratonPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { allRaces, markers, labels, calendarLabel, year } = await getCategoryPageData(locale);
  const t = await getTranslations({ locale, namespace: 'mediaMaraton' });

  const races = allRaces.filter(
    (race) => race.distanceKm >= DISTANCE_MIN && race.distanceKm <= DISTANCE_MAX,
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
        { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/media-maraton` },
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
