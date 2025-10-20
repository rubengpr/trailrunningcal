import { AVAILABLE_LANGUAGES } from '../i18n/config';

const langs =
  navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

export function getPreferredLanguage(
  langs: string[],
  availableLangs: readonly string[],
) {
  for (const lang of langs) {
    if (availableLangs.includes(lang)) {
      return lang;
    }
  }
  return 'es';
}

export const preferredLang = getPreferredLanguage(langs, AVAILABLE_LANGUAGES);
