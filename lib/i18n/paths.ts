import type { Locale } from '@/i18n';

const CONTACT_PATHS: Record<Locale, string> = {
  es: 'contacto',
  ca: 'contacte',
  en: 'contact',
};

const FAVORITES_PATHS: Record<Locale, string> = {
  es: 'mis-eventos',
  ca: 'mis-eventos',
  en: 'my-events',
};

export function getContactPath(locale: Locale): string {
  return `/${locale}/${CONTACT_PATHS[locale]}`;
}

export function getFavoritesPath(locale: Locale): string {
  return `/${locale}/${FAVORITES_PATHS[locale]}`;
}

export function getEnglishBackofficeRedirectPath(pathname: string): string | null {
  if (!/^\/en\/(?:admin|org)(?:\/|$)/.test(pathname)) {
    return null;
  }

  return `/es${pathname.slice('/en'.length)}`;
}
