import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { buildTypeAlternateLinks, getTypePath } from '@/lib/content/alternate-links';
import { getCategoryPageData } from '@/lib/content/category-page';
import { CategoryMapPage } from '@/components/layout/category-map-page';
import { getRaceCategoryConfig, isRaceCategorySlug } from '@/lib/races/race-types';
import { generateMetadataFromOptions } from '@/lib/seo/meta-config';
import { buildBreadcrumbJsonLd, type FaqItem } from '@/lib/seo/json-ld';

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; type: string }>;
}): Promise<Metadata> {
  const { locale, type } = await params;
  setRequestLocale(locale);

  if (!isRaceCategorySlug(type)) {
    return {};
  }

  const config = getRaceCategoryConfig(type);
  const t = await getTranslations({ locale, namespace: config.namespace });
  const year = new Date().getFullYear();

  return generateMetadataFromOptions({
    title: t('pageTitle', { year }),
    description: t('pageDescription', { year }),
    canonicalUrl: `${BASE_URL}${getTypePath(locale, config.slug)}`,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildTypeAlternateLinks(config.slug),
  });
}

export default async function TypePage({
  params,
}: {
  params: Promise<{ locale: Locale; type: string }>;
}) {
  const { locale, type } = await params;
  setRequestLocale(locale);

  if (!isRaceCategorySlug(type)) {
    notFound();
  }

  const config = getRaceCategoryConfig(type);
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
        { name: t('breadcrumb'), url: `${BASE_URL}${getTypePath(locale, config.slug)}` },
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
