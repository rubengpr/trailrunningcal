import { BASE_URL } from './config';
import { getPostBySlug, getPostTranslations } from './blog-utils';
import type { Locale } from '@/i18n';

/**
 * Builds HTTP Link header value for blog post alternate language links
 * @param locale - Current locale
 * @param slug - Current slug
 * @returns Link header value string or null if post not found
 */
export function buildBlogPostLinkHeader(
  locale: Locale,
  slug: string,
): string | null {
  const post = getPostBySlug(slug, locale);
  if (!post) {
    return null;
  }

  const translations = getPostTranslations(post.translationKey);
  const linkParts: string[] = [];

  // Add alternate language links
  for (const translation of translations) {
    const url = `${BASE_URL}/${translation.locale}/blog/${translation.slug}`;
    linkParts.push(
      `<${url}>; rel="alternate"; hreflang="${translation.locale}"`,
    );
  }

  // Add x-default pointing to Spanish (or first available)
  const defaultTranslation =
    translations.find((t) => t.locale === 'es') || translations[0];
  if (defaultTranslation) {
    const defaultUrl = `${BASE_URL}/${defaultTranslation.locale}/blog/${defaultTranslation.slug}`;
    linkParts.push(`<${defaultUrl}>; rel="alternate"; hreflang="x-default"`);
  }

  return linkParts.join(', ');
}
