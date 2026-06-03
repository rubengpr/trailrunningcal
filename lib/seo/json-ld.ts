import type { BlogPost } from '@/lib/content/blog-utils';
import type { TrailRace } from '@/types/race.types';
import type { TrailEventDetail } from '@/types/event.types';
import type { Locale } from '@/i18n';
import { BASE_URL, CONTACT_EMAIL } from '@/lib/config';
import { getDisplayPrice } from '@/lib/races/utils';
import { SITE_NAME } from '@/lib/seo/meta-config';

const LOGO_URL =
  'https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg';

const LOCALE_LANGUAGE: Record<Locale, string> = {
  es: 'es-ES',
  ca: 'ca-ES',
};

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildFaqJsonLd(faqs: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    inLanguage: ['es-ES', 'ca-ES'],
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
    },
  };
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: CONTACT_EMAIL,
      contactType: 'customer service',
      availableLanguage: ['Spanish', 'Catalan'],
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Cataluña',
      containedInPlace: {
        '@type': 'Country',
        name: 'España',
      },
    },
  };
}

export function buildBlogJsonLd(post: BlogPost): Record<string, unknown> {
  const postUrl = `${BASE_URL}/${post.locale}/blog/${post.slug}`;
  const imageUrl = post.image.startsWith('http')
    ? post.image
    : `${BASE_URL}${post.image}`;

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

export function buildRaceJsonLd(
  race: TrailRace,
  raceSlug: string,
  locale: Locale,
): Record<string, unknown> {
  const eventUrl = `${BASE_URL}/${locale}/carrera/${raceSlug}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.name,
    sport: 'Trail Running',
    url: eventUrl,
    location: {
      '@type': 'Place',
      name: `${race.city}, ${race.province}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: race.city,
        addressRegion: race.province,
        addressCountry: 'ES',
      },
    },
  };

  if (race.date) {
    jsonLd.startDate = race.date;
    jsonLd.eventStatus = 'https://schema.org/EventScheduled';
  }

  if (race.description) {
    jsonLd.description = race.description;
  }

  if (race.websiteUrl) {
    jsonLd.sameAs = race.websiteUrl;
  }

  const price = getDisplayPrice(race.priceEur);
  if (price !== null) {
    jsonLd.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'EUR',
      url: eventUrl,
    };
  }

  return jsonLd;
}

export function buildEventJsonLd(
  detail: TrailEventDetail,
  eventSlug: string,
  locale: Locale,
): Record<string, unknown> {
  const eventUrl = `${BASE_URL}/${locale}/e/${eventSlug}`;
  const { event, dateRange, location } = detail;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    sport: 'Trail Running',
    url: eventUrl,
  };

  if (dateRange.startDate) {
    jsonLd.startDate = dateRange.startDate;
    jsonLd.eventStatus = 'https://schema.org/EventScheduled';
  }

  if (dateRange.endDate && dateRange.endDate !== dateRange.startDate) {
    jsonLd.endDate = dateRange.endDate;
  }

  if (event.description) {
    jsonLd.description = event.description;
  }

  if (event.websiteUrl) {
    jsonLd.sameAs = event.websiteUrl;
  }

  if (!location.isMultipleLocations && location.city && location.province) {
    jsonLd.location = {
      '@type': 'Place',
      name: `${location.city}, ${location.province}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: location.city,
        addressRegion: location.province,
        addressCountry: 'ES',
      },
    };
  }

  return jsonLd;
}
