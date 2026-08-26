import { BASE_URL } from '@/lib/config';
import { locales, type Locale } from '@/i18n';
import { getTypePath, type RaceCategorySlug } from '@/lib/races/race-types';
import { getPostBySlug, getPostTranslations } from '@/lib/content/blog-utils';
import { getContactPath } from '@/lib/i18n/paths';

export { getTypePath } from '@/lib/races/race-types';
export {
  buildDestinationAlternateLinks,
  buildRegionAlternateLinks,
  getDestinationPath,
  getRegionPath,
} from '@/lib/geography/destinations';

export function buildHomeAlternateLinks(): Record<string, string> {
  const alternates = Object.fromEntries(
    locales.map((locale) => [locale, `${BASE_URL}/${locale}`]),
  );
  alternates['x-default'] = `${BASE_URL}/es`;
  return alternates;
}

export function buildBlogListingAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/blog`,
    ca: `${BASE_URL}/ca/blog`,
    'x-default': `${BASE_URL}/es/blog`,
  };
}

export function buildBlogPostAlternateLinks(
  locale: Locale,
  slug: string,
): Record<string, string> | undefined {
  const post = getPostBySlug(slug, locale);
  if (!post) {
    return undefined;
  }

  const translations = getPostTranslations(post.translationKey);
  const alternates: Record<string, string> = {};

  for (const translation of translations) {
    alternates[translation.locale] = `${BASE_URL}/${translation.locale}/blog/${translation.slug}`;
  }

  const spanishTranslation = translations.find(
    (translation) => translation.locale === 'es',
  )!;
  alternates['x-default'] = `${BASE_URL}/${spanishTranslation.locale}/blog/${spanishTranslation.slug}`;

  return alternates;
}

export function buildContactAlternateLinks(): Record<string, string> {
  const alternates = Object.fromEntries(
    locales.map((locale) => [locale, `${BASE_URL}${getContactPath(locale)}`]),
  );
  alternates['x-default'] = `${BASE_URL}/es/contacto`;
  return alternates;
}

export function buildTypeAlternateLinks(
  typeSlug: RaceCategorySlug,
): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of locales) {
    alternates[locale] = `${BASE_URL}${getTypePath(locale, typeSlug)}`;
  }
  alternates['x-default'] = `${BASE_URL}${getTypePath('es', typeSlug)}`;
  return alternates;
}

export function buildEventAlternateLinks(
  eventSlug: string,
): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of locales) {
    alternates[locale] = `${BASE_URL}/${locale}/e/${eventSlug}`;
  }
  alternates['x-default'] = `${BASE_URL}/es/e/${eventSlug}`;
  return alternates;
}
