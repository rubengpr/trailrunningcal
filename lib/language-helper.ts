import { locales, type Locale } from '@/i18n';

export const AVAILABLE_LANGUAGES = locales;

export function resolveSupportedLanguage(language: string): Locale {
  return locales.includes(language as Locale) ? (language as Locale) : 'es';
}

