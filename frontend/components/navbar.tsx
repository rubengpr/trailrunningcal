'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';
import posthog from 'posthog-js';

export default function Navbar() {
  const t = useTranslations('navigation');
  const locale = useLocale();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="w-full bg-white border-b border-indigo-100/60 px-4 py-4 sm:px-6 lg:px-8">
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
            src="https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg"
            width={40}
            height={40}
            className="w-6 h-6 sm:w-10 sm:h-10"
            alt="Trail Running Calendar logo"
          />
          <span className="font-semibold text-xs sm:text-lg">
            {t('appName')}
          </span>
        </Link>
        <nav className="text-sm flex justify-center items-center gap-6">
          <div className="hidden sm:flex px-2 py-1 flex-row items-center gap-4">
          <Link
              href={`/${locale}/blog`}
              className="hover:text-indigo-600 transition-colors"
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
              className="hover:text-indigo-600 transition-colors"
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
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
