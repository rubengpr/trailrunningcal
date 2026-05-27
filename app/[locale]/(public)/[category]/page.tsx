import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd, type FaqItem } from '@/lib/seo/json-ld';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { generateCategoryMetadata, getCategoryPageData } from '@/lib/content/category-page';
import { getRaceCategoryConfig, isRaceCategorySlug } from '@/lib/races/categories';

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  setRequestLocale(locale);

  if (!isRaceCategorySlug(category)) {
    return {};
  }

  const config = getRaceCategoryConfig(category);

  return generateCategoryMetadata({
    locale,
    namespace: config.namespace,
    slug: config.slug,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: Locale; category: string }>;
}) {
  const { locale, category } = await params;
  setRequestLocale(locale);

  if (!isRaceCategorySlug(category)) {
    notFound();
  }

  const config = getRaceCategoryConfig(category);
  const { allRaces, markers, labels, calendarLabel } = await getCategoryPageData(locale);
  const t = await getTranslations({ locale, namespace: config.namespace });

  const races = allRaces.filter(config.matches);

  const contentSections = Object.values(
    t.raw('contentSections') as Record<string, FaqItem>,
  );

  return (
    <CategoryMapPage
      locale={locale}
      races={races}
      markers={markers}
      breadcrumbJsonLd={buildBreadcrumbJsonLd([
        { name: calendarLabel, url: `${BASE_URL}/${locale}` },
        { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/${config.slug}` },
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
