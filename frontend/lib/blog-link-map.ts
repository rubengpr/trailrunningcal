import { BASE_URL } from './config';
import { getAllBlogPosts, getPostTranslations } from './blog-utils';

/**
 * Builds a mapping of blog post URLs to their alternate language Link headers
 * This is generated at build time since proxy runs in Node.js Runtime
 */
export function buildBlogPostLinkMap(): Record<string, string> {
  const posts = getAllBlogPosts();
  const linkMap: Record<string, string> = {};

  for (const post of posts) {
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

    // Use the post's pathname as the key (works in both dev and production)
    const postPathname = `/${post.locale}/blog/${post.slug}`;
    linkMap[postPathname] = linkParts.join(', ');
  }

  return linkMap;
}
