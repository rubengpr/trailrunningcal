'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

    const isActive = (path: string) => pathname === path;

    return (
        <>
            {/* Mobile: horizontal tab bar below the main navbar */}
            <nav className="flex md:hidden w-full bg-white border-b border-gray-100 overflow-x-auto shrink-0">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                                active
                                    ? 'border-gray-900 text-gray-900 font-medium'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span className={active ? 'text-gray-700' : 'text-gray-400'}>
                                {item.icon}
                            </span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Desktop: sidebar */}
            <aside className="hidden md:flex flex-col h-screen sticky top-0 w-64 bg-white border-r border-gray-100 shrink-0">
                <nav className="flex flex-col flex-1 px-4 py-6 gap-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={false}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ease-in-out ${
                                    active
                                        ? 'bg-gray-100 text-gray-900 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <span className={`transition-colors duration-200 ${active ? 'text-gray-700' : 'text-gray-400'}`}>
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
