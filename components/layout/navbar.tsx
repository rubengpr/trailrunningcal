'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import posthog from 'posthog-js';
import { createClient } from '@/lib/supabase/client';
import { useEventFavorites } from '@/hooks/use-event-favorites';
import { FavoritesNavLink } from '@/components/layout/favorites-nav-link';
import { ExploreMenu } from '@/components/layout/explore-menu';
import { useMobileFilters } from '@/components/providers/mobile-filters-provider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { isBlogLocale, isPublicOnlyLocale, type Locale } from '@/i18n';
import { getContactPath, getFavoritesPath } from '@/lib/i18n/paths';
import { Menu, CircleUser, SlidersHorizontal } from 'lucide-react';

interface NavbarProps {
  sticky?: boolean;
}

export function Navbar({ sticky = true }: NavbarProps) {
  const t = useTranslations('navigation');
  const locale = useLocale() as Locale;
  const favoritesPath = getFavoritesPath(locale);
  const contactPath = getContactPath(locale);
  const profilePath = isPublicOnlyLocale(locale) ? '/es/org/perfil' : `/${locale}/org/perfil`;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();
  const { favorites } = useEventFavorites();
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
    <header className={`${sticky ? 'sticky top-0 z-30' : ''} w-full h-18 sm:h-20 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center`}>
      <div className="w-full flex items-center justify-between relative">

        {/* LEFT: hamburger (mobile) / logo (desktop) */}
        <div className="flex items-center">
          <button
            type="button"
            className="flex sm:hidden p-1 text-gray-400"
            onClick={handleMenuClick}
            title={t('openMenu')}
          >
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <Link
            href={`/${locale}`}
            prefetch={false}
            className="hidden sm:flex items-center gap-2"
            onClick={logoClickHandler}
          >
            <Image
              src="/assets/web-app-manifest-192x192.png"
              width={28}
              height={28}
              className="size-7"
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
          prefetch={false}
          className="sm:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
          onClick={logoClickHandler}
        >
          <Image
            src="/assets/web-app-manifest-192x192.png"
            width={24}
            height={24}
            className="size-6"
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
            <FavoritesNavLink
              href={favoritesPath}
              locale={locale}
              hasFavorites={favorites.size > 0}
              className="p-1 hover:text-gray-900 transition-colors"
              iconClassName="text-gray-700"
            />
            <ExploreMenu locale={locale} />
            {isBlogLocale(locale) && (
              <Link href={`/${locale}/blog`} prefetch={false} className="hover:text-gray-900 transition-colors" onClick={() => setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'blog', link_href: `/${locale}/blog`, locale }), 0)}>{t('blog')}</Link>
            )}
            <Link href={contactPath} prefetch={false} className="hover:text-gray-900 transition-colors" onClick={() => setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'contact', link_href: contactPath, locale }), 0)}>{t('contact')}</Link>
            {isAuthenticated && (
              <Link href={profilePath} prefetch={false} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'profile', link_href: profilePath, locale }), 0)}>
                <CircleUser className="size-5 text-gray-700" strokeWidth={1.5} />
              </Link>
            )}
          </div>

          {/* Mobile: heart icon (homepage only) */}
          {isHomepage && (
            <FavoritesNavLink
              href={favoritesPath}
              locale={locale}
              hasFavorites={favorites.size > 0}
              className="flex sm:hidden p-1 text-gray-400"
              title={t('myEvents')}
            />
          )}

          {/* Mobile: filter icon */}
          {isFilterAvailable && filterVariant === 'control' && (
            <button
              type="button"
              className="relative flex sm:hidden items-center gap-1 p-1 text-gray-400"
              onClick={() => { openFilters(); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_FILTER_ICON_CLICKED, { filter_count: filterCount, variant: filterVariant }), 0); }}
            >
              <SlidersHorizontal className="size-5" strokeWidth={2} />
              {filterCount > 0 && (
                <span className="absolute top-0 right-0 flex size-4 items-center justify-center rounded-full bg-black text-[9px] font-semibold text-white">
                  {filterCount}
                </span>
              )}
            </button>
          )}

          {isMenuOpen && (
            <div className="fixed text-black inset-0 top-16 bg-white z-40 flex flex-col items-center justify-start pt-8 gap-6 font-semibold text-lg">
              <Link href={`/${locale}`} prefetch={false} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'home', link_href: `/${locale}`, locale }), 0); }}>{t('calendar')}</Link>
              <Link href={favoritesPath} prefetch={false} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'my_events', link_href: favoritesPath, locale }), 0); }}>{t('myEvents')}</Link>
              <Link href={contactPath} prefetch={false} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'contact', link_href: contactPath, locale }), 0); }}>{t('contact')}</Link>
              {isBlogLocale(locale) && (
                <Link href={`/${locale}/blog`} prefetch={false} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'blog', link_href: `/${locale}/blog`, locale }), 0); }}>{t('blog')}</Link>
              )}
              {isAuthenticated && (
                <Link href={profilePath} prefetch={false} onClick={() => { setIsMenuOpen(false); setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED, { link_text: 'profile', link_href: profilePath, locale }), 0); }}>{t('profile')}</Link>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
