import { BASE_URL } from './config';
import { locales, type Locale } from '@/i18n';
import { getPostBySlug, getPostTranslations } from './blog-utils';

/**
 * Builds alternate language links for the home page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildHomeAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es`,
    ca: `${BASE_URL}/ca`,
    'x-default': `${BASE_URL}/es`,
  };
}

/**
 * Builds alternate language links for the blog listing page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildBlogListingAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/blog`,
    ca: `${BASE_URL}/ca/blog`,
    'x-default': `${BASE_URL}/es/blog`,
  };
}

/**
 * Builds alternate language links for a blog post
 * Uses translationKey to find all translations of the post
 * @param locale - Current locale
 * @param slug - Current slug
 * @returns Record with alternate URLs or undefined if post not found
 */
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

  // Add alternate language links
  for (const translation of translations) {
    alternates[translation.locale] = `${BASE_URL}/${translation.locale}/blog/${translation.slug}`;
  }

  // Add x-default pointing to Spanish blog post (always Spanish)
  const spanishTranslation = translations.find(
    (translation) => translation.locale === 'es',
  )!;
  alternates['x-default'] = `${BASE_URL}/${spanishTranslation.locale}/blog/${spanishTranslation.slug}`;

  return alternates;
}

/**
 * Builds alternate language links for the contact page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildContactAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/contacto`,
    ca: `${BASE_URL}/ca/contacte`,
    'x-default': `${BASE_URL}/es/contacto`,
  };
}

/**
 * Builds alternate language links for a province page
 * Province slugs are the same across locales
 * @param provinceSlug - The province slug (e.g. 'barcelona')
 * @returns Record with es, ca, and x-default URLs
 */
export function buildProvinceAlternateLinks(
  provinceSlug: string,
): Record<string, string> {
  return {
    es: `${BASE_URL}/es/provincia/${provinceSlug}`,
    ca: `${BASE_URL}/ca/provincia/${provinceSlug}`,
    'x-default': `${BASE_URL}/es/provincia/${provinceSlug}`,
  };
}

/**
 * Builds alternate language links for the ultra-trail page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildUltraTrailAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/ultra-trail`,
    ca: `${BASE_URL}/ca/ultra-trail`,
    'x-default': `${BASE_URL}/es/ultra-trail`,
  };
}

/**
 * Builds alternate language links for the maraton page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildMaratonAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/maraton`,
    ca: `${BASE_URL}/ca/maraton`,
    'x-default': `${BASE_URL}/es/maraton`,
  };
}

/**
 * Builds alternate language links for the media-maraton page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildMediaMaratonAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/media-maraton`,
    ca: `${BASE_URL}/ca/media-maraton`,
    'x-default': `${BASE_URL}/es/media-maraton`,
  };
}

/**
 * Builds alternate language links for the marcha page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildMarchaAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/marcha`,
    ca: `${BASE_URL}/ca/marcha`,
    'x-default': `${BASE_URL}/es/marcha`,
  };
}

/**
 * Builds alternate language links for the backyard page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildBackyardAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/backyard`,
    ca: `${BASE_URL}/ca/backyard`,
    'x-default': `${BASE_URL}/es/backyard`,
  };
}

/**
 * Builds alternate language links for the km-vertical page
 * @returns Record with es, ca, and x-default URLs
 */
export function buildKmVerticalAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/km-vertical`,
    ca: `${BASE_URL}/ca/km-vertical`,
    'x-default': `${BASE_URL}/es/km-vertical`,
  };
}

/**
 * Builds alternate language links for a race page
 * Race slugs are the same across locales (generated from race name)
 * @param raceSlug - The race slug
 * @returns Record with es, ca, and x-default URLs
 */
export function buildRaceAlternateLinks(
  raceSlug: string,
): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of locales) {
    alternates[locale] = `${BASE_URL}/${locale}/carrera/${raceSlug}`;
  }
  alternates['x-default'] = `${BASE_URL}/es/carrera/${raceSlug}`;
  return alternates;
}
