'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function OrganizerSidebar() {
    const locale = useLocale();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isActive = (path: string) => pathname === path;

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleNavClick = () => {
        setIsMenuOpen(false);
    };

    const navItems = [
        {
            href: `/${locale}`,
            label: locale === 'ca' ? 'Calendari' : 'Calendario',
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
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                    />
                </svg>
            ),
        },
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
            label: locale === 'ca' ? 'Curses' : 'Carreras',
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
        {
            href: `/${locale}/org/sponsors`,
            label: 'Sponsors',
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
                        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.847-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18 8.25l-.32 1.123a3.375 3.375 0 0 1-2.307 2.307L14.25 12l1.123.32a3.375 3.375 0 0 1 2.307 2.307L18 15.75l.32-1.123a3.375 3.375 0 0 1 2.307-2.307L21.75 12l-1.123-.32a3.375 3.375 0 0 1-2.307-2.307L18 8.25Z"
                    />
                </svg>
            ),
        },
    ];

    return (
        <>
            {/* Mobile Header - visible only on mobile */}
            <header className="flex md:hidden w-full bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex justify-between items-center w-full">
                    <Link
                        href={`/${locale}/org/perfil`}
                        className="flex items-center gap-3"
                    >
                        <Image
                            src="https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg"
                            width={40}
                            height={40}
                            alt="Trailrunningcal.com logo"
                            className="w-8 h-8"
                        />
                    </Link>
                    <svg
                        className="h-5 w-5 text-gray-400 cursor-pointer"
                        onClick={handleMenuClick}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 top-20 bg-white z-40 flex flex-col items-center justify-start pt-8 gap-6 font-semibold text-lg md:hidden">
                    <div className="flex items-center justify-center mb-4">
                        <Image
                            src="https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg"
                            width={48}
                            height={48}
                            alt="Trailrunningcal.com logo"
                            className="w-12 h-12"
                        />
                    </div>
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={handleNavClick}
                                className={`
                                    flex items-center gap-3 px-6 py-3
                                    ${active ? 'text-gray-900' : 'text-gray-600'}
                                `}
                            >
                                <span className={active ? 'text-gray-700' : 'text-gray-400'}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Desktop Sidebar - hidden on mobile */}
            <aside className="hidden md:flex flex-col h-screen w-64 bg-white border-r border-gray-100">
                <div className="flex items-center justify-center px-6 py-8 border-b border-gray-100">
                    <Image
                        src="https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg"
                        width={48}
                        height={48}
                        alt="Trailrunningcal.com logo"
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
        </>
    );
}
