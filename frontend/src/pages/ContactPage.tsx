import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { getSeoMetaConfig, resolveSupportedLanguage } from '../seo/meta-config';

export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const language = resolveSupportedLanguage(i18n.language);
  const seoMeta = getSeoMetaConfig('contact', language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900 flex flex-col">
      <Helmet>
        <html lang={seoMeta.htmlLang} />
        <title>{`${t('contact.title')} | ${seoMeta.siteName}`}</title>
        <meta name="description" content={t(seoMeta.descriptionKey)} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content={seoMeta.ogType} />
        <meta
          property="og:title"
          content={`${t('contact.title')} | ${seoMeta.siteName}`}
        />
        <meta property="og:description" content={t(seoMeta.descriptionKey)} />
        <meta property="og:url" content={seoMeta.canonicalUrl} />
        <meta property="og:locale" content={seoMeta.locale} />
        <meta property="og:site_name" content={seoMeta.siteName} />
        <meta property="og:image" content={seoMeta.ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content={seoMeta.twitterCard} />
        <meta
          name="twitter:title"
          content={`${t('contact.title')} | ${seoMeta.siteName}`}
        />
        <meta name="twitter:description" content={t(seoMeta.descriptionKey)} />
        <meta name="twitter:image" content={seoMeta.ogImageUrl} />
        <link rel="canonical" href={seoMeta.canonicalUrl} />
        {seoMeta.alternateLinks.map((link) => (
          <link
            key={`${link.hrefLang}-${link.href}`}
            rel="alternate"
            hrefLang={link.hrefLang}
            href={link.href}
          />
        ))}
      </Helmet>
      <Navbar />

      <main id="main-content" className="flex-1 mx-auto max-w-4xl px-4 py-20">
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
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-indigo-600"
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
                href="mailto:info@trailrunningcal.com"
                className="text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md px-1"
                aria-label={t('contact.emailAria')}
              >
                info@trailrunningcal.com
              </a>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg
                    className="h-6 w-6 text-indigo-600"
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
