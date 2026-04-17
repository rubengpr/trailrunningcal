'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import posthog from 'posthog-js';
import { createClient } from '@/lib/supabase/client';
import { useFavorites } from '@/hooks/use-favorites';
import { useMobileFilters } from '@/components/providers/mobile-filters-provider';

export default function Navbar() {
  const t = useTranslations('navigation');
  const tFilters = useTranslations('filters');
  const locale = useLocale();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { favorites } = useFavorites();
  const { isAvailable: isFilterAvailable, open: openFilters, filterCount, filterVariant } = useMobileFilters();

  const isHomepage = pathname === `/${locale}`;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
          posthog.identify(user.id, { email: user.email });
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        posthog.identify(session.user.id, { email: session.user.email });
      } else {
        setIsAuthenticated(false);
        posthog.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setIsCategoriesOpen(false);
      }
    };

    if (isCategoriesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoriesOpen]);

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const logoClickHandler = () =>
    setTimeout(() => posthog.capture('navbar_link_clicked', {
      link_text: 'home_logo',
      link_href: `/${locale}`,
      locale,
    }), 0);

  return (
    <header className="sticky top-0 z-30 w-full h-18 sm:h-20 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center">
      <div className="w-full flex items-center justify-between relative">

        {/* LEFT: hamburger (mobile) / logo (desktop) */}
        <div className="flex items-center">
          <button
            className="flex sm:hidden p-1 text-gray-400"
            onClick={handleMenuClick}
            title={t('openMenu')}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link
            href={`/${locale}`}
            className="hidden sm:flex items-center gap-2"
            onClick={logoClickHandler}
          >
            <Image
              src="/assets/web-app-manifest-192x192.png"
              width={28}
              height={28}
              className="w-7 h-7"
              alt="Trail Running Calendar logo"
              priority
            />
            <Image
              src="/logo.svg"
              width={48}
              height={20}
              className="h-5 w-auto"
              alt="TRC"
              unoptimized
              priority
            />
          </Link>
        </div>

        {/* CENTER: logo (mobile only, absolutely positioned) */}
        <Link
          href={`/${locale}`}
          className="sm:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
          onClick={logoClickHandler}
        >
          <Image
            src="/assets/web-app-manifest-192x192.png"
            width={24}
            height={24}
            className="w-6 h-6"
            alt="Trail Running Calendar logo"
            priority
          />
          <Image
            src="/logo.svg"
            width={40}
            height={17}
            className="h-4 w-auto"
            alt="TRC"
            unoptimized
            priority
          />
        </Link>

        {/* RIGHT: desktop nav / mobile icons */}
        <nav className="text-sm flex items-center gap-6">
          <div className="hidden sm:flex px-2 py-1 flex-row items-center gap-4">
            <Link
              href={`/${locale}/mis-carreras`}
              className="relative p-1 hover:text-gray-900 transition-colors"
              onClick={() =>
                setTimeout(() => posthog.capture('navbar_link_clicked', {
                  link_text: 'my_races',
                  link_href: `/${locale}/mis-carreras`,
                  locale,
                }), 0)
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
              {favorites.size > 0 && (
                <span className="absolute top-0 right-0 block w-2 h-2 rounded-full bg-red-500" />
              )}
            </Link>
            <div className="relative" ref={categoriesRef}>
              <button
                className="flex items-center gap-1 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
              >
                {t('explore')}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isCategoriesOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[320px] p-3 flex gap-6">
                  <div className="flex-1">
                    <p className="px-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('categoriesHeading')}</p>
                    <Link href={`/${locale}/ultra-trail`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'ultra_trail', link_href: `/${locale}/ultra-trail`, locale }), 0); }}>{t('ultraTrail')}</Link>
                    <Link href={`/${locale}/maraton`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'maraton', link_href: `/${locale}/maraton`, locale }), 0); }}>{t('maraton')}</Link>
                    <Link href={`/${locale}/media-maraton`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'media_maraton', link_href: `/${locale}/media-maraton`, locale }), 0); }}>{t('mediaMaraton')}</Link>
                    <Link href={`/${locale}/marcha`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'marcha', link_href: `/${locale}/marcha`, locale }), 0); }}>{t('marcha')}</Link>
                    <Link href={`/${locale}/km-vertical`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'km_vertical', link_href: `/${locale}/km-vertical`, locale }), 0); }}>{t('kmVertical')}</Link>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="flex-1">
                    <p className="px-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('provincesHeading')}</p>
                    {(['barcelona', 'girona', 'lleida', 'tarragona'] as const).map((province) => (
                      <Link
                        key={province}
                        href={`/${locale}/provincia/${province}`}
                        className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors"
                        onClick={() => { setIsCategoriesOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: province, link_href: `/${locale}/provincia/${province}`, locale }), 0); }}
                      >
                        {t(province)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link href={`/${locale}/blog`} className="hover:text-gray-900 transition-colors" onClick={() => setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'blog', link_href: `/${locale}/blog`, locale }), 0)}>{t('blog')}</Link>
            <Link href={`/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`} className="hover:text-gray-900 transition-colors" onClick={() => setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'contact', link_href: `/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`, locale }), 0)}>{t('contact')}</Link>
            {isAuthenticated && (
              <Link href={`/${locale}/org/perfil`} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'profile', link_href: `/${locale}/org/perfil`, locale }), 0)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </Link>
            )}
          </div>

          {/* Mobile: heart icon (homepage only) */}
          {isHomepage && (
            <Link
              href={`/${locale}/mis-carreras`}
              className="relative flex sm:hidden p-1 text-gray-400"
              title={t('myRaces')}
              onClick={() =>
                setTimeout(() => posthog.capture('navbar_link_clicked', {
                  link_text: 'my_races',
                  link_href: `/${locale}/mis-carreras`,
                  locale,
                }), 0)
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
              {favorites.size > 0 && (
                <span className="absolute top-0 right-0 block w-2 h-2 rounded-full bg-red-500" />
              )}
            </Link>
          )}

          {/* Mobile: filter icon */}
          {isFilterAvailable && filterVariant === 'control' && (
            <button
              className="relative flex sm:hidden items-center gap-1 p-1 text-gray-400"
              onClick={() => { openFilters(); setTimeout(() => posthog.capture('navbar_filter_icon_clicked', { filter_count: filterCount, variant: filterVariant }), 0); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 5H3" />
                <path d="M12 19H3" />
                <path d="M14 3v4" />
                <path d="M16 17v4" />
                <path d="M21 12h-9" />
                <path d="M21 19h-5" />
                <path d="M21 5h-7" />
                <path d="M8 10v4" />
                <path d="M8 12H3" />
              </svg>
              {filterCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-semibold text-white">
                  {filterCount}
                </span>
              )}
            </button>
          )}

          {isMenuOpen && (
            <div className="fixed text-black inset-0 top-16 bg-white z-40 flex flex-col items-center justify-start pt-8 gap-6 font-semibold text-lg">
              <Link href={`/${locale}`} onClick={() => { setIsMenuOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'home', link_href: `/${locale}`, locale }), 0); }}>{t('calendar')}</Link>
              <Link href={`/${locale}/mis-carreras`} onClick={() => { setIsMenuOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'my_races', link_href: `/${locale}/mis-carreras`, locale }), 0); }}>{t('myRaces')}</Link>
              <Link href={`/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`} onClick={() => { setIsMenuOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'contact', link_href: `/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`, locale }), 0); }}>{t('contact')}</Link>
              <Link href={`/${locale}/blog`} onClick={() => { setIsMenuOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'blog', link_href: `/${locale}/blog`, locale }), 0); }}>{t('blog')}</Link>
              {isAuthenticated && (
                <Link href={`/${locale}/org/perfil`} onClick={() => { setIsMenuOpen(false); setTimeout(() => posthog.capture('navbar_link_clicked', { link_text: 'profile', link_href: `/${locale}/org/perfil`, locale }), 0); }}>{t('profile')}</Link>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
