import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import HomeClient from '../components/home-client';
import HeroSection from '../components/hero-section';
import { races } from '../data/races';
import { getSeoMetaConfig } from '../seo/meta-config';
import type { Locale } from '../i18n';

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

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: seoMeta.canonicalUrl,
      languages: Object.fromEntries(
        seoMeta.alternateLinks.map((link) => [link.hrefLang, link.href]),
      ),
    },
    openGraph: {
      type: seoMeta.ogType,
      title,
      description,
      url: seoMeta.canonicalUrl,
      locale: seoMeta.locale,
      siteName: seoMeta.siteName,
      images: [
        {
          url: seoMeta.ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: seoMeta.twitterCard,
      title,
      description,
      images: [seoMeta.ogImageUrl],
    },
  };
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
