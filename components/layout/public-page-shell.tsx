import type { ReactNode } from 'react';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { MobileFiltersProvider } from '@/components/providers/mobile-filters-provider';

interface PublicPageShellProps {
  children: ReactNode;
  header?: ReactNode;
}

export function PublicPageShell({ children, header = <Navbar /> }: PublicPageShellProps) {
  return (
    <MobileFiltersProvider>
      <div className="min-h-screen w-full min-w-0 text-gray-900 flex flex-col bg-white [overflow-x:clip]">
        {header}
        {children}
        <Footer />
      </div>
    </MobileFiltersProvider>
  );
}
