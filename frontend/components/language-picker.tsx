'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Locale } from '../i18n';

export default function LanguagePicker() {
  const t = useTranslations('navigation');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: Locale) => {
    // Get the pathname without the current locale prefix
    const segments = pathname.split('/').filter(Boolean);
    // Remove the locale segment if it exists
    if (segments[0] === locale) {
      segments.shift();
    }
    // Build the new path with the new locale
    const newPath = `/${newLocale}${segments.length > 0 ? '/' + segments.join('/') : ''}`;
    router.push(newPath);
    router.refresh();
  };

  return (
    <div
      className="flex items-center gap-2"
    >
      <button
        onClick={() => handleLanguageChange('es')}
        className={`px-2 py-1 rounded-sm sm:rounded-md cursor-pointer transition-colors ${
          locale === 'es'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <p className="text-2xl">🇪🇸</p>
      </button>
      <button
        onClick={() => handleLanguageChange('ca')}
        className={`px-2 py-1 rounded-sm sm:rounded-md cursor-pointer transition-colors ${
          locale === 'ca'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Image
          src="/assets/catalan-flag.png"
          alt=""
          width={32}
          height={32}
          className="w-6 h-6 sm:w-8 sm:h-8"
        />
      </button>
    </div>
  );
}

