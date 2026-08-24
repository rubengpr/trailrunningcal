import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from '../i18n';
import spanishMessages from '../locales/es/translation.json';

function mergeMessages(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = merged[key];
    merged[key] =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
        ? mergeMessages(
            baseValue as Record<string, unknown>,
            value as Record<string, unknown>,
          )
        : value;
  }

  return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  const isSupportedLocale = (value: unknown): value is Locale =>
    typeof value === 'string' && locales.includes(value as Locale);

  // Ensure locale is a supported Locale, fallback to default if not
  const finalLocale: Locale = isSupportedLocale(locale)
    ? locale
    : defaultLocale;

  const messages = (await import(`../locales/${finalLocale}/translation.json`))
    .default as Record<string, unknown>;

  return {
    locale: finalLocale,
    messages:
      finalLocale === 'en'
        ? mergeMessages(spanishMessages, messages)
        : messages,
  };
});
