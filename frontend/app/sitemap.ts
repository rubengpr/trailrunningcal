import { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/config';
import { locales, type Locale } from '@/i18n';

const CONTACT_PATHS: Record<Locale, string> = {
  es: 'contacto',
  ca: 'contacte',
};

function buildAlternateLanguages(
  currentLocale: Locale | null,
  pageType: 'home' | 'contact',
): Record<string, string> {
  const alternates: Record<string, string> = {};

  if (pageType === 'home') {
    for (const locale of locales) {
      alternates[locale] = `${BASE_URL}/${locale}`;
    }
  } else {
    // Contact page
    for (const locale of locales) {
      alternates[locale] = `${BASE_URL}/${locale}/${CONTACT_PATHS[locale]}`;
    }
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

  return urls;
}
