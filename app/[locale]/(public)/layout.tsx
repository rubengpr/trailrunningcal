import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PromoTextStrip } from '@/components/home/promo-banner';
import { MobileFiltersProvider } from '@/components/providers/mobile-filters-provider';
import type { Locale } from '@/i18n';

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'navigation' });
  const tBanner = await getTranslations({ locale, namespace: 'banner' });

  return (
    <MobileFiltersProvider>
      <div className="min-h-screen w-full min-w-0 text-gray-900 flex flex-col bg-white [overflow-x:clip]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded-md focus:shadow-md focus:text-sm focus:font-medium"
        >
          {t('skipToContent')}
        </a>
        <Navbar />
        <PromoTextStrip
          message={tBanner('announcement')}
          code={tBanner('code')}
        />
        <div id="main-content" className="min-w-0">
          {children}
        </div>
        <Footer />
      </div>
    </MobileFiltersProvider>
  );
}
