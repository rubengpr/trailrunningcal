import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import {
  getSeoMetaConfig,
  generateMetadataFromOptions,
} from '@/seo/meta-config';
import type { Locale } from '@/i18n';
import { CONTACT_EMAIL } from '@/lib/config';
import { buildContactAlternateLinks } from '@/lib/alternate-links';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const seoMeta = getSeoMetaConfig('contact', locale);

  const title = t(seoMeta.titleKey);
  const description = t(seoMeta.descriptionKey);

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl: seoMeta.canonicalUrl,
    locale,
    ogImageUrl: seoMeta.ogImageUrl,
    ogType: seoMeta.ogType,
    alternateLinks: buildContactAlternateLinks(),
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 text-gray-900 flex flex-col">

      <main className="flex-1 mx-auto max-w-4xl px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('contact.title')}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('contact.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('contact.email')}
                </h3>
              </div>
              <p className="text-gray-600 mb-2">
                {t('contact.emailDescription')}
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-gray-700 hover:text-gray-900 font-medium rounded-md px-1"
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('contact.location')}
                </h3>
              </div>
              <p className="text-gray-600 mb-2">
                {t('contact.locationDescription')}
              </p>
              <p className="text-gray-900 font-medium">
                {t('contact.locationValue')}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('contact.information')}
            </h3>
            <div className="space-y-4 text-gray-600">
              <p>{t('contact.infoDescription1')}</p>
              <p>{t('contact.infoDescription2')}</p>
              <p>{t('contact.infoDescription3')}</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
