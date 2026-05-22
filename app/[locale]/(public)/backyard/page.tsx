import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { generateCategoryMetadata, getCategoryPageData } from '@/lib/content/category-page';
import type { FaqItem } from '@/lib/seo/json-ld';

export const revalidate = 86400;

export const generateMetadata = (props: { params: Promise<{ locale: Locale }> }) =>
  generateCategoryMetadata({ ...props, namespace: 'backyard', slug: 'backyard' });

export default async function BackyardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { allRaces, markers, labels, calendarLabel, year } = await getCategoryPageData(locale);
  const t = await getTranslations({ locale, namespace: 'backyard' });

  const races = allRaces.filter((race) => race.name.toLowerCase().includes('backyard'));

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
        { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/backyard` },
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
