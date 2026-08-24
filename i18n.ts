export const locales = ['es', 'ca', 'en', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const blogLocales = ['es', 'ca'] as const;
export type BlogLocale = (typeof blogLocales)[number];

export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
  fr: 'Français',
};

export const localeTags: Record<Locale, string> = {
  es: 'es-ES',
  ca: 'ca-ES',
  en: 'en-GB',
  fr: 'fr-FR',
};

export const openGraphLocales: Record<Locale, string> = {
  es: 'es_ES',
  ca: 'ca_ES',
  en: 'en_GB',
  fr: 'fr_FR',
};

export const publicOnlyLocales = ['en', 'fr'] as const;
export type PublicOnlyLocale = (typeof publicOnlyLocales)[number];

export function isBlogLocale(locale: Locale): locale is BlogLocale {
  return blogLocales.includes(locale as BlogLocale);
}

export function isPublicOnlyLocale(locale: Locale): locale is PublicOnlyLocale {
  return publicOnlyLocales.includes(locale as PublicOnlyLocale);
}
