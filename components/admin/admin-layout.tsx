'use client';

import type { ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { Calendar, Trophy } from 'lucide-react';
import { AppSidebar } from '@/components/ui/app-sidebar';
import type { NavItem } from '@/components/ui/app-sidebar';

interface AdminLayoutProps {
    children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const locale = useLocale();

    const navItems: NavItem[] = [
        {
            href: `/${locale}`,
            label: locale === 'ca' ? 'Calendari' : 'Calendario',
            icon: <Calendar className="size-4" strokeWidth={1.5} />,
        },
        {
            href: `/${locale}/admin/eventos`,
            label: locale === 'ca' ? 'Esdeveniments' : 'Eventos',
            icon: <Trophy className="size-4" strokeWidth={1.5} />,
        },
    ];

    return (
        <div className="flex flex-col md:flex-row">
            <AppSidebar navItems={navItems} />
            <div className="flex flex-col w-full p-6">
                {children}
            </div>
        </div>
    );
}
