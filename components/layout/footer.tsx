'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

export default function Footer() {
  const t = useTranslations('footer');
  const tCat = useTranslations();
  const locale = useLocale();

  return (
    <footer className="border-t border-gray-200 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        <nav className="flex flex-wrap justify-center sm:justify-end gap-x-4 gap-y-2">
          <Link href={`/${locale}/ultra-trail`} className="hover:text-gray-900 transition-colors">
            {tCat('ultraTrail.breadcrumb')}
          </Link>
          <Link href={`/${locale}/maraton`} className="hover:text-gray-900 transition-colors">
            {tCat('maraton.breadcrumb')}
          </Link>
          <Link href={`/${locale}/media-maraton`} className="hover:text-gray-900 transition-colors">
            {tCat('mediaMaraton.breadcrumb')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
