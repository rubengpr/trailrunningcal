import type { ReactNode } from 'react';
import { Sidebar } from '@/components/ui/sidebar';
import type { NavItem } from '@/components/ui/sidebar';

interface DashboardLayoutProps {
  navItems: NavItem[];
  children: ReactNode;
}

export function DashboardLayout({ navItems, children }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row">
      <Sidebar navItems={navItems} />
      <div className="flex flex-col w-full p-6">
        {children}
      </div>
    </div>
  );
}
