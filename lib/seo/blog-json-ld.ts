import type { BlogPost } from '@/lib/blog-utils';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { SITE_NAME } from '@/seo/meta-config';

const LOCALE_LANGUAGE: Record<Locale, string> = {
  es: 'es-ES',
  ca: 'ca-ES',
};

export function buildBlogJsonLd(post: BlogPost): Record<string, unknown> {
  const postUrl = `${BASE_URL}/${post.locale}/blog/${post.slug}`;
  const imageUrl = post.image.startsWith('http') ? post.image : `${BASE_URL}${post.image}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.dateModified ?? post.date,
    url: postUrl,
    inLanguage: LOCALE_LANGUAGE[post.locale],
    image: {
      '@type': 'ImageObject',
      url: imageUrl,
      caption: post.imageAlt,
    },
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
    },
  };
}
