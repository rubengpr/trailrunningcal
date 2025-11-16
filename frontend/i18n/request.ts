import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '../i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  const isSupportedLocale = (value: unknown): value is Locale =>
    typeof value === 'string' && locales.includes(value as Locale);

  if (!isSupportedLocale(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}/translation.json`)).default,
  };
});

