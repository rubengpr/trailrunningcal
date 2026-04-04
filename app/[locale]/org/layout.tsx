import type { Metadata } from 'next';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import { MobileFiltersProvider } from '@/components/providers/mobile-filters-provider';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileFiltersProvider>
      <div className="min-h-screen w-full min-w-0 text-gray-900 flex flex-col bg-white [overflow-x:clip]">
        <Navbar />
        <div className="min-w-0 flex-1">
          {children}
        </div>
        <Footer />
      </div>
    </MobileFiltersProvider>
  );
}
