export const locales = ['es', 'ca', 'en'] as const;
export type Locale = (typeof locales)[number];

export const blogLocales = ['es', 'ca'] as const;
export type BlogLocale = (typeof blogLocales)[number];

export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
};

export const localeTags: Record<Locale, string> = {
  es: 'es-ES',
  ca: 'ca-ES',
  en: 'en-GB',
};

export const openGraphLocales: Record<Locale, string> = {
  es: 'es_ES',
  ca: 'ca_ES',
  en: 'en_GB',
};

export function isBlogLocale(locale: Locale): locale is BlogLocale {
  return blogLocales.includes(locale as BlogLocale);
}
