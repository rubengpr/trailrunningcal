'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import posthog from 'posthog-js';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const t = useTranslations('navigation');
  const locale = useLocale();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

    // Listen for auth state changes
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

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3"
          onClick={() =>
            posthog.capture('navbar_link_clicked', {
              link_text: 'home_logo',
              link_href: `/${locale}`,
              locale: locale,
            })
          }
        >
          <Image
            src="/logo.svg"
            width={40}
            height={40}
            className="w-6 h-6 sm:w-10 sm:h-10"
            alt="Trail Running Calendar logo"
            priority
          />
          <span className="font-semibold text-xs sm:text-lg">
            {t('appName')}
          </span>
        </Link>
        <nav className="text-sm flex justify-center items-center gap-6">
          <div className="hidden sm:flex px-2 py-1 flex-row items-center gap-4">
          <Link
              href={`/${locale}/blog`}
              className="hover:text-gray-900 transition-colors"
              onClick={() =>
                posthog.capture('navbar_link_clicked', {
                  link_text: 'blog',
                  link_href: `/${locale}/blog`,
                  locale: locale,
                })
              }
            >
              {t('blog')}
            </Link>
            <Link
              href={`/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`}
              className="hover:text-gray-900 transition-colors"
              onClick={() =>
                posthog.capture('navbar_link_clicked', {
                  link_text: 'contact',
                  link_href: `/${locale}/${
                    locale === 'ca' ? 'contacte' : 'contacto'
                  }`,
                  locale: locale,
                })
              }
            >
              {t('contact')}
            </Link>
            {isAuthenticated && (
              <Link
                href={`/${locale}/org/perfil`}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={t('profile')}
                onClick={() =>
                  posthog.capture('navbar_link_clicked', {
                    link_text: 'profile',
                    link_href: `/${locale}/org/perfil`,
                    locale: locale,
                  })
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-700"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              </Link>
            )}
          </div>
          <svg
            className="flex sm:hidden mx-auto h-5 w-5 text-gray-400 cursor-pointer"
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
          {isMenuOpen && (
            <div className="fixed text-black inset-0 top-20 bg-white z-40 flex flex-col items-center justify-start pt-8 gap-6 font-semibold text-lg">
              <Link
                href={`/${locale}`}
                onClick={() => {
                  setIsMenuOpen(false);
                  posthog.capture('navbar_link_clicked', {
                    link_text: 'home',
                    link_href: `/${locale}`,
                    locale: locale,
                  });
                }}
              >
                {t('calendar')}
              </Link>
              <Link
                href={`/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`}
                onClick={() => {
                  setIsMenuOpen(false);
                  posthog.capture('navbar_link_clicked', {
                    link_text: 'contact',
                    link_href: `/${locale}/${
                      locale === 'ca' ? 'contacte' : 'contacto'
                    }`,
                    locale: locale,
                  });
                }}
              >
                {t('contact')}
              </Link>
              <Link
                href={`/${locale}/blog`}
                onClick={() => {
                  setIsMenuOpen(false);
                  posthog.capture('navbar_link_clicked', {
                    link_text: 'blog',
                    link_href: `/${locale}/blog`,
                    locale: locale,
                  });
                }}
              >
                {t('blog')}
              </Link>
              {isAuthenticated && (
                <Link
                  href={`/${locale}/org/perfil`}
                  onClick={() => {
                    setIsMenuOpen(false);
                    posthog.capture('navbar_link_clicked', {
                      link_text: 'profile',
                      link_href: `/${locale}/org/perfil`,
                      locale: locale,
                    });
                  }}
                >
                  {t('profile')}
                </Link>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
