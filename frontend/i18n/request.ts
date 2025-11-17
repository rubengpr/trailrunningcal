import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from '../i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  const isSupportedLocale = (value: unknown): value is Locale =>
    typeof value === 'string' && locales.includes(value as Locale);

  // Ensure locale is a supported Locale, fallback to default if not
  const finalLocale: Locale = isSupportedLocale(locale)
    ? locale
    : defaultLocale;

  return {
    locale: finalLocale,
    messages: (await import(`../locales/${finalLocale}/translation.json`))
      .default,
  };
});
