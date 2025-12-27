import { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/config';
import { locales, type Locale } from '@/i18n';
import { getAllBlogPosts, getPostTranslations } from '@/lib/blog-utils';

const CONTACT_PATHS: Record<Locale, string> = {
  es: 'contacto',
  ca: 'contacte',
};

function buildAlternateLanguages(
  currentLocale: Locale | null,
  pageType: 'home' | 'contact' | 'blog' | 'blogPost',
  translationKey?: string,
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
  } else if (pageType === 'blogPost' && translationKey) {
    // Blog post page - get all translations
    const translations = getPostTranslations(translationKey);
    for (const translation of translations) {
      alternates[translation.locale] = `${BASE_URL}/${translation.locale}/blog/${translation.slug}`;
    }
    // For blog posts, prefer Spanish, otherwise use first available translation
    const defaultTranslation = translations.find((t) => t.locale === 'es') || translations[0];
    if (defaultTranslation) {
      alternates['x-default'] = `${BASE_URL}/${defaultTranslation.locale}/blog/${defaultTranslation.slug}`;
    } else {
      alternates['x-default'] = `${BASE_URL}/es`;
    }
    return alternates;
  }

  // Set x-default for non-blogPost pages
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

  // Add blog post pages (all locales)
  const blogPosts = getAllBlogPosts();
  for (const post of blogPosts) {
    // ISO dates parse reliably, fallback to currentDate if missing/invalid
    const postDate = post.date
      ? isNaN(new Date(post.date).getTime())
        ? currentDate
        : new Date(post.date)
      : currentDate;
    urls.push({
      url: `${BASE_URL}/${post.locale}/blog/${post.slug}`,
      lastModified: postDate,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: buildAlternateLanguages(post.locale, 'blogPost', post.translationKey),
      },
    });
  }

  return urls;
}
