import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '../../../../../i18n';
import { getRaces } from '@/lib/db/races';
import { generateMetadataFromOptions } from '../../../../../seo/meta-config';
import { buildProvinceAlternateLinks } from '../../../../../lib/alternate-links';
import { BASE_URL } from '../../../../../lib/config';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import ProvinceHeroSection from '../../../../../components/province-hero-section';
import HomeClient from '../../../../../components/home-client';

export const dynamic = 'force-dynamic';

const PROVINCE_SLUGS = ['barcelona', 'girona', 'lleida', 'tarragona'] as const;
type ProvinceSlug = (typeof PROVINCE_SLUGS)[number];

const PROVINCE_DB_NAMES: Record<ProvinceSlug, string> = {
  barcelona: 'Barcelona',
  girona: 'Girona',
  lleida: 'Lleida',
  tarragona: 'Tarragona',
};

function isValidProvince(value: string): value is ProvinceSlug {
  return PROVINCE_SLUGS.includes(value as ProvinceSlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; province: string }>;
}): Promise<Metadata> {
  const { locale, province } = await params;

  if (!isValidProvince(province)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'provincia' });
  const provinceName = t(`names.${province}`);
  const title = t('pageTitle', { province: provinceName });
  const description = t('pageDescription', { province: provinceName });
  const canonicalUrl = `${BASE_URL}/${locale}/provincia/${province}`;

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
    ogType: 'website',
    alternateLinks: buildProvinceAlternateLinks(province),
  });
}

export default async function ProvincePage({
  params,
}: {
  params: Promise<{ locale: Locale; province: string }>;
}) {
  const { locale, province } = await params;

  if (!isValidProvince(province)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'provincia' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const provinceName = t(`names.${province}`);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    { name: provinceName, url: `${BASE_URL}/${locale}/provincia/${province}` },
  ]);

  const allRaces = await getRaces();
  const provinceRaces = allRaces.filter(
    (race) => race.province === PROVINCE_DB_NAMES[province],
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProvinceHeroSection
        title={t('pageTitle', { province: provinceName })}
        subtitle={t('pageSubtitle', { province: provinceName })}
        description={t('pageDescription', { province: provinceName })}
        breadcrumb={t('breadcrumb')}
      />
      <HomeClient races={provinceRaces} showProvinceFilter={false} />
    </>
  );
}
