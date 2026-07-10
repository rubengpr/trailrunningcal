'use client';

import { useLocale } from 'next-intl';
import { Calendar, CircleUser, Sparkles, Trophy } from 'lucide-react';
import { AppSidebar } from '@/components/ui/app-sidebar';
import type { NavItem } from '@/components/ui/app-sidebar';

export function OrganizerSidebar() {
    const locale = useLocale();

    const navItems: NavItem[] = [
        {
            href: `/${locale}`,
            label: locale === 'ca' ? 'Calendari' : 'Calendario',
            icon: <Calendar className="w-5 h-5" strokeWidth={1.5} />,
        },
        {
            href: `/${locale}/org/perfil`,
            label: 'Perfil',
            icon: <CircleUser className="w-5 h-5" strokeWidth={1.5} />,
        },
        {
            href: `/${locale}/org/eventos`,
            label: locale === 'ca' ? 'Esdeveniments' : 'Eventos',
            icon: <Trophy className="w-5 h-5" strokeWidth={1.5} />,
        },
        {
            href: `/${locale}/org/sponsors`,
            label: 'Sponsors',
            icon: <Sparkles className="w-5 h-5" strokeWidth={1.5} />,
        },
    ];

    return <AppSidebar navItems={navItems} />;
}
