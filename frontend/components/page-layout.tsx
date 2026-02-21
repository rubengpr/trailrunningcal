import { ReactNode } from 'react';
import Navbar from './navbar';
import Footer from './footer';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className={`min-h-screen w-full text-gray-900 flex flex-col bg-white ${className}`.trim()}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
