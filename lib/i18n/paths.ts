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

export const LEGAL_DOCUMENT_IDS = [
  'legalNotice',
  'privacy',
  'cookies',
  'terms',
] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number];

const LEGAL_PATHS: Record<
  Locale,
  Record<LegalDocumentId, string>
> = {
  es: {
    legalNotice: 'aviso-legal',
    privacy: 'privacidad',
    cookies: 'cookies',
    terms: 'condiciones-de-uso',
  },
  ca: {
    legalNotice: 'avis-legal',
    privacy: 'privacitat',
    cookies: 'cookies',
    terms: 'condicions-us',
  },
  en: {
    legalNotice: 'legal-notice',
    privacy: 'privacy',
    cookies: 'cookies',
    terms: 'terms-of-use',
  },
  fr: {
    legalNotice: 'mentions-legales',
    privacy: 'confidentialite',
    cookies: 'cookies',
    terms: 'conditions-utilisation',
  },
};

export function getContactPath(locale: Locale): string {
  return `/${locale}/${CONTACT_PATHS[locale]}`;
}

export function getFavoritesPath(locale: Locale): string {
  return `/${locale}/${FAVORITES_PATHS[locale]}`;
}

export function getLegalPath(
  locale: Locale,
  documentId: LegalDocumentId,
): string {
  return `/${locale}/${LEGAL_PATHS[locale][documentId]}`;
}

export function getLegalDocumentId(
  locale: Locale,
  slug: string,
): LegalDocumentId | null {
  return LEGAL_DOCUMENT_IDS.find(
    (documentId) => LEGAL_PATHS[locale][documentId] === slug,
  ) ?? null;
}

export function getPublicBackofficeRedirectPath(pathname: string): string | null {
  const match = pathname.match(/^\/(en|fr)\/(?:admin|org)(?:\/|$)/);

  if (!match) {
    return null;
  }

  return `/es${pathname.slice(match[1].length + 1)}`;
}
