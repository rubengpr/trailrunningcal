'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import LanguagePicker from './language-picker';

export default function Navbar() {
  const t = useTranslations('navigation');
  const locale = useLocale();

  return (
    <header className="w-full bg-white border-b border-indigo-100/60 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <Image
            src="/assets/trc-logo.svg"
            className="w-6 h-6 sm:w-10 sm:h-10"
            alt="Trail Running Calendar logo"
          />
          <span className="font-semibold text-xs sm:text-lg">
            {t('appName')}
          </span>
        </Link>
        <nav className="text-sm">
          <div className="flex flex-row items-center gap-4">
            <Link
              href={`/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`}
              className="hidden sm:flex px-2 py-1 hover:text-indigo-600 transition-colors"
            >
              {t('contact')}
            </Link>
            <LanguagePicker />
          </div>
        </nav>
      </div>
    </header>
  );
}
