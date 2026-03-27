import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { getRaces } from '@/lib/db/races';
import { generateMetadataFromOptions } from '@/seo/meta-config';
import { buildMarchaAlternateLinks } from '@/lib/alternate-links';
import { BASE_URL } from '@/lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import CategoryHeroSection from '@/components/layout/category-hero-section';
import HomeClient from '@/components/home/home-client';

export const revalidate = 300;

const WALKING_KEYWORDS = ['marcha', 'marxa', 'caminada'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'marcha' });
  const year = new Date().getFullYear();
  const title = t('pageTitle', { year });
  const description = t('pageDescription', { year });
  const canonicalUrl = `${BASE_URL}/${locale}/marcha`;

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildMarchaAlternateLinks(),
  });
}

export default async function MarchaPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'marcha' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const year = new Date().getFullYear();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/marcha` },
  ]);

  const allRaces = await getRaces();
  const marchaRaces = allRaces.filter((race) => {
    const lowerName = race.name.toLowerCase();
    return WALKING_KEYWORDS.some((keyword) => lowerName.includes(keyword));
  });

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
      <HomeClient races={marchaRaces} showProvinceFilter={false} />
    </>
  );
}
