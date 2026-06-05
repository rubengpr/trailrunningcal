'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

export function AdminEventsTabs() {
  const t = useTranslations('admin.events.tabs');
  const locale = useLocale();
  const pathname = usePathname();

  const tabs = [
    { label: t('activos'), slug: 'activos', href: `/${locale}/admin/eventos/activos` },
    { label: t('pendientes'), slug: 'pendientes', href: `/${locale}/admin/eventos/pendientes` },
  ];

  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = pathname.endsWith(`/eventos/${tab.slug}`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
