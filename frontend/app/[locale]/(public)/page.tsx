import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import HomeClient from '../../../components/home-client';
import HeroSection from '../../../components/hero-section';
import {
  getSeoMetaConfig,
  generateMetadataFromOptions,
} from '../../../seo/meta-config';
import type { Locale } from '../../../i18n';
import { buildHomeAlternateLinks } from '../../../lib/alternate-links';
import { getRaces } from '@/lib/db/races';
import {
  buildWebsiteJsonLd,
  buildOrganizationJsonLd,
  buildFaqJsonLd,
} from '@/lib/seo/home-json-ld';

export const revalidate = 300; // 5 minutes

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

  const races = await getRaces();

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
      <HeroSection />
      <HomeClient races={races} />
    </>
  );
}
