'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import LanguagePicker from './language-picker';
import posthog from 'posthog-js';

export default function Navbar() {
  const t = useTranslations('navigation');
  const locale = useLocale();

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
            src="/assets/trc-logo.svg"
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
          </div>
          <LanguagePicker />
          <svg
            className="flex sm:hidden mx-auto h-5 w-5 text-gray-400 cursor-pointer"
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
        </nav>
      </div>
    </header>
  );
}
