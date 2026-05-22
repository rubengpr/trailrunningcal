import { BASE_URL } from '@/lib/config';
import { locales, type Locale } from '@/i18n';
import { getPostBySlug, getPostTranslations } from '@/lib/content/blog-utils';

export function buildHomeAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es`,
    ca: `${BASE_URL}/ca`,
    'x-default': `${BASE_URL}/es`,
  };
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
  return {
    es: `${BASE_URL}/es/contacto`,
    ca: `${BASE_URL}/ca/contacte`,
    'x-default': `${BASE_URL}/es/contacto`,
  };
}

export function buildProvinceAlternateLinks(
  provinceSlug: string,
): Record<string, string> {
  return {
    es: `${BASE_URL}/es/provincia/${provinceSlug}`,
    ca: `${BASE_URL}/ca/provincia/${provinceSlug}`,
    'x-default': `${BASE_URL}/es/provincia/${provinceSlug}`,
  };
}

export function buildStaticPublicAlternateLinks(slug: string): Record<string, string> {
  return {
    es: `${BASE_URL}/es/${slug}`,
    ca: `${BASE_URL}/ca/${slug}`,
    'x-default': `${BASE_URL}/es/${slug}`,
  };
}

export function buildUltraTrailAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/ultra-trail`,
    ca: `${BASE_URL}/ca/ultra-trail`,
    'x-default': `${BASE_URL}/es/ultra-trail`,
  };
}

export function buildMaratonAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/maraton`,
    ca: `${BASE_URL}/ca/maraton`,
    'x-default': `${BASE_URL}/es/maraton`,
  };
}

export function buildMediaMaratonAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/media-maraton`,
    ca: `${BASE_URL}/ca/media-maraton`,
    'x-default': `${BASE_URL}/es/media-maraton`,
  };
}

export function buildMarchaAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/marcha`,
    ca: `${BASE_URL}/ca/marcha`,
    'x-default': `${BASE_URL}/es/marcha`,
  };
}

export function buildBackyardAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/backyard`,
    ca: `${BASE_URL}/ca/backyard`,
    'x-default': `${BASE_URL}/es/backyard`,
  };
}

export function buildKmVerticalAlternateLinks(): Record<string, string> {
  return {
    es: `${BASE_URL}/es/km-vertical`,
    ca: `${BASE_URL}/ca/km-vertical`,
    'x-default': `${BASE_URL}/es/km-vertical`,
  };
}

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
