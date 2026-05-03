import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { getRaces } from '@/lib/db/races';
import { BASE_URL } from '@/lib/config';
import { generateMetadataFromOptions } from '@/seo/meta-config';
import { FavoritesClient } from '@/components/home/favorites-client';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'favorites' });

  return generateMetadataFromOptions({
    title: t('pageTitle'),
    description: t('pageTitle'),
    canonicalUrl: `${BASE_URL}/${locale}/mis-carreras`,
    locale,
    ogImageUrl: `${BASE_URL}/og-image.png`,
  });
}

export default async function MisCarrerasPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'favorites' });
  const races = await getRaces();

  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">{t('pageTitle')}</h1>
        <FavoritesClient races={races} />
      </div>
    </div>
  );
}
