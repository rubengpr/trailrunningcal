'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Calendar, CircleUser, Sparkles, Trophy } from 'lucide-react';
import { Sidebar } from '@/components/ui/sidebar';
import type { NavItem } from '@/components/ui/sidebar';

interface OrganizerLayoutProps {
  children: ReactNode;
}

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  const locale = useLocale();
  const t = useTranslations('sidebar');

  const navItems: NavItem[] = [
    {
      href: `/${locale}`,
      label: t('calendar'),
      icon: <Calendar className="size-4" strokeWidth={1.5} />,
      match: 'exact',
    },
    {
      href: `/${locale}/org/perfil`,
      label: t('profile'),
      icon: <CircleUser className="size-4" strokeWidth={1.5} />,
      match: 'prefix',
    },
    {
      href: `/${locale}/org/eventos`,
      label: t('events'),
      icon: <Trophy className="size-4" strokeWidth={1.5} />,
      match: 'prefix',
    },
    {
      href: `/${locale}/org/sponsors`,
      label: t('sponsors'),
      icon: <Sparkles className="size-4" strokeWidth={1.5} />,
      match: 'prefix',
    },
  ];

  return (
    <div className="flex flex-col md:flex-row">
      <Sidebar navItems={navItems} />
      <div className="flex flex-col w-full p-6">
        {children}
      </div>
    </div>
  );
}
