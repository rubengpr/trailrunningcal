export type SupportedLanguage = 'es' | 'ca';

export type SeoPageId = 'home' | 'contact';

interface SeoRouteConfig {
  pathByLanguage: Record<SupportedLanguage, string>;
  titleKey: string;
  descriptionKey: string;
  ogType: 'website' | 'article';
}

export interface SeoMetaPayload {
  canonicalUrl: string;
  htmlLang: SupportedLanguage;
  locale: string;
  titleKey: string;
  descriptionKey: string;
  siteName: string;
  twitterCard: 'summary_large_image';
  ogType: 'website' | 'article';
  ogImageUrl: string;
  alternateLinks: Array<{ hrefLang: string; href: string }>;
}

const BASE_URL = 'https://trailrunningcal.com';
const SITE_NAME = 'Trail Running Calendar';
const DEFAULT_OG_IMAGE = `${BASE_URL}/favicon.png`;

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
};

const LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  es: 'es_ES',
  ca: 'ca_ES',
};

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
  language: SupportedLanguage,
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

export function resolveSupportedLanguage(language: string): SupportedLanguage {
  return language === 'ca' ? 'ca' : 'es';
}
