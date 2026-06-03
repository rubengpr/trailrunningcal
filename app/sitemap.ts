import { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/config';
import { locales, type Locale } from '@/i18n';
import { getAllBlogPosts } from '@/lib/content/blog-utils';
import { RACE_CATEGORY_SLUGS } from '@/lib/races/race-types';
import { DESTINATION_PROVINCE_IDS } from '@/lib/geography/destinations';
import { getEvents } from '@/lib/db/events';
import {
  buildHomeAlternateLinks,
  buildBlogListingAlternateLinks,
  buildContactAlternateLinks,
  buildBlogPostAlternateLinks,
  buildTypeAlternateLinks,
  buildDestinationAlternateLinks,
  buildEventAlternateLinks,
  getDestinationPath,
  getTypePath,
} from '@/lib/content/alternate-links';

const CONTACT_PATHS: Record<Locale, string> = {
  es: 'contacto',
  ca: 'contacte',
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();

  // Use static client for static generation (sitemap is always generated at build time)
  const events = await getEvents();

  const urls: MetadataRoute.Sitemap = [];

  // Add localized homepages
  for (const locale of locales) {
    urls.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: buildHomeAlternateLinks(),
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
        languages: buildContactAlternateLinks(),
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
        languages: buildBlogListingAlternateLinks(),
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
    const alternateLinks = buildBlogPostAlternateLinks(post.locale, post.slug);
    if (alternateLinks) {
      urls.push({
        url: `${BASE_URL}/${post.locale}/blog/${post.slug}`,
        lastModified: postDate,
        changeFrequency: 'monthly',
        priority: 0.9,
        alternates: {
          languages: alternateLinks,
        },
      });
    }
  }

  for (const provinceId of DESTINATION_PROVINCE_IDS) {
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}${getDestinationPath(locale, 'catalonia', provinceId)}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.9,
        alternates: {
          languages: buildDestinationAlternateLinks('catalonia', provinceId),
        },
      });
    }
  }

  for (const typeSlug of RACE_CATEGORY_SLUGS) {
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}${getTypePath(locale, typeSlug)}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: buildTypeAlternateLinks(typeSlug),
        },
      });
    }
  }

  // Add event pages (all locales)
  for (const eventDetail of events) {
    const eventSlug = eventDetail.event.slug;
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}/e/${eventSlug}`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.8,
        alternates: {
          languages: buildEventAlternateLinks(eventSlug),
        },
      });
    }
  }

  return urls;
}
