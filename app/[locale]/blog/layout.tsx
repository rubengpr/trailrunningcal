import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MobileFiltersProvider } from '@/components/providers/mobile-filters-provider';
import { notFound } from 'next/navigation';

export default async function BlogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (locale === 'en') {
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
