import { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/config';
import { locales, type Locale } from '@/i18n';
import { getAllBlogPosts } from '@/lib/blog-utils';
import { generateRaceSlug } from '@/lib/race-utils';
import { getRaces } from '@/lib/db/races';
import {
  buildHomeAlternateLinks,
  buildBlogListingAlternateLinks,
  buildContactAlternateLinks,
  buildRaceAlternateLinks,
  buildBlogPostAlternateLinks,
  buildProvinceAlternateLinks,
  buildUltraTrailAlternateLinks,
  buildMaratonAlternateLinks,
  buildMediaMaratonAlternateLinks,
} from '@/lib/alternate-links';

const PROVINCE_SLUGS = ['barcelona', 'girona', 'lleida', 'tarragona'] as const;

const CONTACT_PATHS: Record<Locale, string> = {
  es: 'contacto',
  ca: 'contacte',
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();

  // Use static client for static generation (sitemap is always generated at build time)
  const races = await getRaces(true);

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

  // Add province pages (all locales)
  for (const province of PROVINCE_SLUGS) {
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}/provincia/${province}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.9,
        alternates: {
          languages: buildProvinceAlternateLinks(province),
        },
      });
    }
  }

  // Add ultra trail page (both locales)
  for (const locale of locales) {
    urls.push({
      url: `${BASE_URL}/${locale}/ultra-trail`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: buildUltraTrailAlternateLinks(),
      },
    });
  }

  // Add marathon page (both locales)
  for (const locale of locales) {
    urls.push({
      url: `${BASE_URL}/${locale}/maraton`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: buildMaratonAlternateLinks(),
      },
    });
  }

  // Add half-marathon page (both locales)
  for (const locale of locales) {
    urls.push({
      url: `${BASE_URL}/${locale}/media-maraton`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: buildMediaMaratonAlternateLinks(),
      },
    });
  }

  // Add race pages (all locales)
  for (const race of races) {
    const raceSlug = generateRaceSlug(race.name);
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}/carrera/${raceSlug}`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.8,
        alternates: {
          languages: buildRaceAlternateLinks(raceSlug),
        },
      });
    }
  }

  return urls;
}
