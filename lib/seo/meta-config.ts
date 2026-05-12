import type { Metadata } from 'next';
import type { Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';

export type SeoPageId = 'home' | 'contact' | 'blog';

interface SeoRouteConfig {
  pathByLanguage: Record<Locale, string>;
  titleKey: string;
  descriptionKey: string;
  ogType: 'website' | 'article';
}

export interface SeoMetaPayload {
  canonicalUrl: string;
  htmlLang: Locale;
  locale: string;
  titleKey: string;
  descriptionKey: string;
  siteName: string;
  twitterCard: 'summary_large_image';
  ogType: 'website' | 'article';
  ogImageUrl: string;
  alternateLinks: Array<{ hrefLang: string; href: string }>;
}

const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

const SEO_ROUTES: Record<SeoPageId, SeoRouteConfig> = {
  home: {
    pathByLanguage: {
      es: '/es',
      ca: '/ca',
    },
    titleKey: 'title',
    descriptionKey: 'subtitle',
    ogType: 'website',
  },
  contact: {
    pathByLanguage: {
      es: '/es/contacto',
      ca: '/ca/contacte',
    },
    titleKey: 'contact.title',
    descriptionKey: 'contact.description',
    ogType: 'website',
  },
  blog: {
    pathByLanguage: {
      es: '/es/blog',
      ca: '/ca/blog',
    },
    titleKey: 'blog.title',
    descriptionKey: 'blog.description',
    ogType: 'website',
  },
};

export const LOCALE_BY_LANGUAGE: Record<Locale, string> = {
  es: 'es_ES',
  ca: 'ca_ES',
};

export const SITE_NAME = 'Trail Running Calendar';

function buildCanonical(path: string): string {
  return `${BASE_URL}${path}`;
}

function buildAlternateLinks(
  pageId: SeoPageId,
): Array<{ hrefLang: string; href: string }> {
  const { pathByLanguage } = SEO_ROUTES[pageId];
  return [
    {
      hrefLang: 'es',
      href: buildCanonical(pathByLanguage.es),
    },
    {
      hrefLang: 'ca',
      href: buildCanonical(pathByLanguage.ca),
    },
    {
      hrefLang: 'x-default',
      href: buildCanonical(pathByLanguage.es),
    },
  ];
}

export function getSeoMetaConfig(
  pageId: SeoPageId,
  language: Locale,
): SeoMetaPayload {
  const pageConfig = SEO_ROUTES[pageId];
  const canonicalPath = pageConfig.pathByLanguage[language];

  return {
    canonicalUrl: buildCanonical(canonicalPath),
    htmlLang: language,
    locale: LOCALE_BY_LANGUAGE[language],
    titleKey: pageConfig.titleKey,
    descriptionKey: pageConfig.descriptionKey,
    siteName: SITE_NAME,
    twitterCard: 'summary_large_image',
    ogType: pageConfig.ogType,
    ogImageUrl: DEFAULT_OG_IMAGE,
    alternateLinks: buildAlternateLinks(pageId),
  };
}

export interface GenerateMetadataOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  locale: Locale;
  ogImageUrl: string;
  ogImageAlt?: string;
  ogType?: 'website' | 'article';
  alternateLinks?: Record<string, string>;
  publishedTime?: string;
}

export function generateMetadataFromOptions(
  options: GenerateMetadataOptions,
): Metadata {
  const {
    title,
    description,
    canonicalUrl,
    locale,
    ogImageUrl,
    ogImageAlt = title,
    ogType = 'website',
    alternateLinks,
    publishedTime,
  } = options;

  const ogImageFullUrl = ogImageUrl.startsWith('http')
    ? ogImageUrl
    : `${BASE_URL}${ogImageUrl}`;

  const alternatesConfig = {
    canonical: canonicalUrl,
    ...(alternateLinks && {
      languages: alternateLinks,
    }),
  };

  const metadata: Metadata = {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: alternatesConfig,
    openGraph: {
      type: ogType,
      title,
      description,
      url: canonicalUrl,
      locale: LOCALE_BY_LANGUAGE[locale],
      siteName: SITE_NAME,
      images: [
        {
          url: ogImageFullUrl,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
      ...(publishedTime && { publishedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageFullUrl],
    },
  };

  return metadata;
}
