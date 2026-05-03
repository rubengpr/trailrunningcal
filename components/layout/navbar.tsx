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
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { Menu, Heart, ChevronDown, CircleUser, SlidersHorizontal } from 'lucide-react';

export function Navbar() {
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
    setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, {
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
            <Menu className="h-5 w-5" strokeWidth={1.5} />
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
                setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, {
                  link_text: 'my_races',
                  link_href: `/${locale}/mis-carreras`,
                  locale,
                }), 0)
              }
            >
              <Heart className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
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
                <ChevronDown size={16} />
              </button>
              {isCategoriesOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[320px] p-3 flex gap-6">
                  <div className="flex-1">
                    <p className="px-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('categoriesHeading')}</p>
                    <Link href={`/${locale}/ultra-trail`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'ultra_trail', link_href: `/${locale}/ultra-trail`, locale }), 0); }}>{t('ultraTrail')}</Link>
                    <Link href={`/${locale}/maraton`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'maraton', link_href: `/${locale}/maraton`, locale }), 0); }}>{t('maraton')}</Link>
                    <Link href={`/${locale}/media-maraton`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'media_maraton', link_href: `/${locale}/media-maraton`, locale }), 0); }}>{t('mediaMaraton')}</Link>
                    <Link href={`/${locale}/marcha`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'marcha', link_href: `/${locale}/marcha`, locale }), 0); }}>{t('marcha')}</Link>
                    <Link href={`/${locale}/km-vertical`} className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors" onClick={() => { setIsCategoriesOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'km_vertical', link_href: `/${locale}/km-vertical`, locale }), 0); }}>{t('kmVertical')}</Link>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="flex-1">
                    <p className="px-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('provincesHeading')}</p>
                    {(['barcelona', 'girona', 'lleida', 'tarragona'] as const).map((province) => (
                      <Link
                        key={province}
                        href={`/${locale}/provincia/${province}`}
                        className="block px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors"
                        onClick={() => { setIsCategoriesOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: province, link_href: `/${locale}/provincia/${province}`, locale }), 0); }}
                      >
                        {t(province)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link href={`/${locale}/blog`} className="hover:text-gray-900 transition-colors" onClick={() => setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'blog', link_href: `/${locale}/blog`, locale }), 0)}>{t('blog')}</Link>
            <Link href={`/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`} className="hover:text-gray-900 transition-colors" onClick={() => setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'contact', link_href: `/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`, locale }), 0)}>{t('contact')}</Link>
            {isAuthenticated && (
              <Link href={`/${locale}/org/perfil`} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'profile', link_href: `/${locale}/org/perfil`, locale }), 0)}>
                <CircleUser className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
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
                setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, {
                  link_text: 'my_races',
                  link_href: `/${locale}/mis-carreras`,
                  locale,
                }), 0)
              }
            >
              <Heart className="h-5 w-5" strokeWidth={1.5} />
              {favorites.size > 0 && (
                <span className="absolute top-0 right-0 block w-2 h-2 rounded-full bg-red-500" />
              )}
            </Link>
          )}

          {/* Mobile: filter icon */}
          {isFilterAvailable && filterVariant === 'control' && (
            <button
              className="relative flex sm:hidden items-center gap-1 p-1 text-gray-400"
              onClick={() => { openFilters(); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_FILTER_ICON_CLICKED, { filter_count: filterCount, variant: filterVariant }), 0); }}
            >
              <SlidersHorizontal className="h-5 w-5" strokeWidth={2} />
              {filterCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-semibold text-white">
                  {filterCount}
                </span>
              )}
            </button>
          )}

          {isMenuOpen && (
            <div className="fixed text-black inset-0 top-16 bg-white z-40 flex flex-col items-center justify-start pt-8 gap-6 font-semibold text-lg">
              <Link href={`/${locale}`} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'home', link_href: `/${locale}`, locale }), 0); }}>{t('calendar')}</Link>
              <Link href={`/${locale}/mis-carreras`} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'my_races', link_href: `/${locale}/mis-carreras`, locale }), 0); }}>{t('myRaces')}</Link>
              <Link href={`/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'contact', link_href: `/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`, locale }), 0); }}>{t('contact')}</Link>
              <Link href={`/${locale}/blog`} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'blog', link_href: `/${locale}/blog`, locale }), 0); }}>{t('blog')}</Link>
              {isAuthenticated && (
                <Link href={`/${locale}/org/perfil`} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'profile', link_href: `/${locale}/org/perfil`, locale }), 0); }}>{t('profile')}</Link>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
