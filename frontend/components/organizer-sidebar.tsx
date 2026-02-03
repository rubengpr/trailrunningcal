'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';

export function OrganizerSidebar() {
    const locale = useLocale();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    const navItems = [
        {
            href: `/${locale}/org/perfil`,
            label: 'Perfil',
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-5 h-5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                </svg>
            ),
        },
        {
            href: `/${locale}/org/carreras`,
            label: 'Carreras',
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-5 h-5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    />
                </svg>
            ),
        },
    ];

    return (
        <aside className="flex flex-col h-screen w-64 bg-white border-r border-gray-100">
            <div className="flex items-center justify-center px-6 py-8 border-b border-gray-100">
                <Image
                    src="https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg"
                    width={48}
                    height={48}
                    alt="Trailruningcal.com logo"
                    className="w-12 h-12"
                />
            </div>
            <nav className="flex flex-col flex-1 px-4 py-6 gap-1">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-4 py-2.5 rounded-lg
                                transition-all duration-200 ease-in-out
                                ${active
                                    ? 'bg-gray-100 text-gray-900 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }
                            `}
                        >
                            <span
                                className={`
                                    ${active ? 'text-gray-700' : 'text-gray-400'}
                                    transition-colors duration-200
                                `}
                            >
                                {item.icon}
                            </span>
                            <span className="text-sm tracking-tight">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
