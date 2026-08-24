import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MobileFiltersProvider } from '@/components/providers/mobile-filters-provider';
import { notFound } from 'next/navigation';
import { isBlogLocale, type Locale } from '@/i18n';

export default async function BlogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;

  if (!isBlogLocale(locale)) {
    notFound();
  }

  return (
    <MobileFiltersProvider>
      <div className="min-h-screen w-full min-w-0 text-gray-900 flex flex-col bg-white [overflow-x:clip]">
        <Navbar />
        <main className="grow min-w-0">{children}</main>
        <Footer />
      </div>
    </MobileFiltersProvider>
  );
}
