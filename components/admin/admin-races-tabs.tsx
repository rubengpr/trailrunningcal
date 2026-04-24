'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

export function AdminRacesTabs() {
    const t = useTranslations('admin.races.tabs');
    const locale = useLocale();
    const pathname = usePathname();

    const tabs = [
        { label: t('activas'), slug: 'activas', href: `/${locale}/admin/carreras/activas` },
        { label: t('pendientes'), slug: 'pendientes', href: `/${locale}/admin/carreras/pendientes` },
    ];

    return (
        <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
                const isActive = pathname.endsWith(`/carreras/${tab.slug}`);
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
