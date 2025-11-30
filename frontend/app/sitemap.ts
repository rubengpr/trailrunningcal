import { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/config';
import { locales, type Locale } from '@/i18n';
import { getAllBlogPosts } from '@/lib/blog-utils';

const CONTACT_PATHS: Record<Locale, string> = {
  es: 'contacto',
  ca: 'contacte',
};

function buildAlternateLanguages(
  currentLocale: Locale | null,
  pageType: 'home' | 'contact' | 'blog' | 'blogPost',
  slug?: string,
): Record<string, string> {
  const alternates: Record<string, string> = {};

  if (pageType === 'home') {
    for (const locale of locales) {
      alternates[locale] = `${BASE_URL}/${locale}`;
    }
  } else if (pageType === 'contact') {
    // Contact page
    for (const locale of locales) {
      alternates[locale] = `${BASE_URL}/${locale}/${CONTACT_PATHS[locale]}`;
    }
  } else if (pageType === 'blog') {
    // Blog listing page
    for (const locale of locales) {
      alternates[locale] = `${BASE_URL}/${locale}/blog`;
    }
  } else if (pageType === 'blogPost' && slug) {
    // Blog post page (Spanish-only for now)
    alternates['es'] = `${BASE_URL}/es/blog/${slug}`;
  }

  alternates['x-default'] = `${BASE_URL}/es`;

  return alternates;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  const urls: MetadataRoute.Sitemap = [
    // Root homepage
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: buildAlternateLanguages(null, 'home'),
      },
    },
  ];

  // Add localized homepages
  for (const locale of locales) {
    urls.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: buildAlternateLanguages(locale, 'home'),
      },
    });
  }

  // Add contact pages
  for (const locale of locales) {
    urls.push({
      url: `${BASE_URL}/${locale}/${CONTACT_PATHS[locale]}`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: buildAlternateLanguages(locale, 'contact'),
      },
    });
  }

  // Add blog listing pages
  for (const locale of locales) {
    urls.push({
      url: `${BASE_URL}/${locale}/blog`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: buildAlternateLanguages(locale, 'blog'),
      },
    });
  }

  // Add blog post pages (Spanish-only for now)
  const blogPosts = getAllBlogPosts();
  for (const post of blogPosts) {
    // ISO dates parse reliably, fallback to currentDate if missing/invalid
    const postDate = post.date
      ? isNaN(new Date(post.date).getTime())
        ? currentDate
        : new Date(post.date)
      : currentDate;
    urls.push({
      url: `${BASE_URL}/es/blog/${post.slug}`,
      lastModified: postDate,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: buildAlternateLanguages('es', 'blogPost', post.slug),
      },
    });
  }

  return urls;
}
