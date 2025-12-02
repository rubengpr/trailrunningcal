import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';
import HomeClient from '../../components/home-client';
import HeroSection from '../../components/hero-section';
import { races } from '../../data/races';
import {
  getSeoMetaConfig,
  generateMetadataFromOptions,
} from '../../seo/meta-config';
import type { Locale } from '../../i18n';

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
    alternateLinks: Object.fromEntries(
      seoMeta.alternateLinks.map((link) => [link.hrefLang, link.href]),
    ),
  });
}

export default async function HomePage({ 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: _params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col">
      <Navbar />
      <HeroSection />
      <HomeClient races={races} />
      <Footer />
    </div>
  );
}
