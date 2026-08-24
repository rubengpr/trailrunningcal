import type { Locale } from '@/i18n';

const CONTACT_PATHS: Record<Locale, string> = {
  es: 'contacto',
  ca: 'contacte',
  en: 'contact',
  fr: 'contact',
};

const FAVORITES_PATHS: Record<Locale, string> = {
  es: 'mis-eventos',
  ca: 'mis-eventos',
  en: 'my-events',
  fr: 'mes-evenements',
};

export function getContactPath(locale: Locale): string {
  return `/${locale}/${CONTACT_PATHS[locale]}`;
}

export function getFavoritesPath(locale: Locale): string {
  return `/${locale}/${FAVORITES_PATHS[locale]}`;
}

export function getPublicBackofficeRedirectPath(pathname: string): string | null {
  const match = pathname.match(/^\/(en|fr)\/(?:admin|org)(?:\/|$)/);

  if (!match) {
    return null;
  }

  return `/es${pathname.slice(match[1].length + 1)}`;
}
