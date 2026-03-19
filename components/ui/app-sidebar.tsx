'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export interface NavItem {
    href: string;
    label: string;
    icon: ReactNode;
}

interface AppSidebarProps {
    navItems: NavItem[];
}

export function AppSidebar({ navItems }: AppSidebarProps) {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isActive = (path: string) => pathname === path;

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleNavClick = () => {
        setIsMenuOpen(false);
    };

    return (
        <>
            {/* Mobile Header - visible only on mobile */}
            <header className="flex md:hidden w-full bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex justify-between items-center w-full">
                    <Link
                        href="/"
                        className="flex items-center gap-3"
                    >
                        <Image
                            src="https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg"
                            width={40}
                            height={40}
                            alt="Trailrunningcal.com logo"
                            className="w-8 h-8"
                            unoptimized
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
                            unoptimized
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
                        unoptimized
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
