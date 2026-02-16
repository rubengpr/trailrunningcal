import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';
import HomeClient from '../../components/home-client';
import HeroSection from '../../components/hero-section';
import {
  getSeoMetaConfig,
  generateMetadataFromOptions,
} from '../../seo/meta-config';
import type { Locale } from '../../i18n';
import { buildHomeAlternateLinks } from '../../lib/alternate-links';
import { getRaces } from '@/lib/db/races';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const seoMeta = getSeoMetaConfig('home', locale);

  const title = t(seoMeta.titleKey);
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

export default async function HomePage() {
  // Fetch fresh race list on each request so new races appear immediately
  const races = await getRaces();

  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
      <Navbar />
      <HeroSection />
      <HomeClient races={races} />
      <Footer />
    </div>
  );
}
