import type { Locale } from '../i18n';

export type SeoPageId = 'home' | 'contact';

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

const BASE_URL = 'https://trailrunningcal.com';
const SITE_NAME = 'Trail Running Calendar';
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
};

const LOCALE_BY_LANGUAGE: Record<Locale, string> = {
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
  language: Locale,
): SeoMetaPayload {
  //Look inside SEO_ROUTES and store the value of the key pageId on pageConfig
  const pageConfig = SEO_ROUTES[pageId];
  //Get pageConfig object, access pathByLanguage property, and get the canonical path based on the language: locale variable
  const canonicalPath = pageConfig.pathByLanguage[language];

  return {
    //generates a canonicalUrl based on BASE_URL + canonicalPath value (i.e. 'es')
    canonicalUrl: buildCanonical(canonicalPath),
    //sets htmlLanguage to locale lang
    htmlLang: language,
    //maps to a string based on the locale value
    locale: LOCALE_BY_LANGUAGE[language],
    //sets titleKey based on pageConfig titleKey value
    titleKey: pageConfig.titleKey,
    descriptionKey: pageConfig.descriptionKey,
    //defined name site
    siteName: SITE_NAME,
    //??
    twitterCard: 'summary_large_image',
    //tells social media what kind of content the url is (website, article, profile, product)
    ogType: pageConfig.ogType,
    //image used on opengraph cards
    ogImageUrl: DEFAULT_OG_IMAGE,
    //creates links to es, ca and x-default alternate versions of the page
    /* <link rel="alternate" hreflang="es" href="https://yoursite.com/es/contacto" />
      <link rel="alternate" hreflang="ca" href="https://yoursite.com/ca/contacte" />
      <link rel="alternate" hreflang="x-default" href="https://yoursite.com/es/contacto" /> */
    alternateLinks: buildAlternateLinks(pageId),
  };
}
