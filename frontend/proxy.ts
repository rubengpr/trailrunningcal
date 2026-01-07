import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { NextRequest, NextResponse } from 'next/server';
import { BASE_URL } from './lib/config';

// Import blog link map (generated at build time)
// Use dynamic import with fallback for Node.js Runtime compatibility
let BLOG_POST_LINK_MAP: Record<string, string> = {};

// Try to import the generated map (will be available after build)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mapModule = require('./lib/blog-link-map-generated');
  BLOG_POST_LINK_MAP = mapModule.BLOG_POST_LINK_MAP || {};
} catch {
  // File not generated yet - will be empty map (development only)
}

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

/**
 * Builds Link header for blog listing page
 */
function buildBlogLinkHeader(): string {
  const linkParts = [
    `<${BASE_URL}/es/blog>; rel="alternate"; hreflang="es"`,
    `<${BASE_URL}/ca/blog>; rel="alternate"; hreflang="ca"`,
    `<${BASE_URL}/es/blog>; rel="alternate"; hreflang="x-default"`,
  ];
  return linkParts.join(', ');
}

/**
 * Builds Link header for contact page
 */
function buildContactLinkHeader(): string {
  const linkParts = [
    `<${BASE_URL}/es/contacto>; rel="alternate"; hreflang="es"`,
    `<${BASE_URL}/ca/contacte>; rel="alternate"; hreflang="ca"`,
    `<${BASE_URL}/es/contacto>; rel="alternate"; hreflang="x-default"`,
  ];
  return linkParts.join(', ');
}

export default function proxy(request: NextRequest) {
  // Process request with intl middleware first (handles locale routing)
  const intlResponse = intlMiddleware(request);

  // Don't modify redirects
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const pathname = request.nextUrl.pathname;
  let linkHeader: string | null = null;

  // Check if this is a blog post route: /[locale]/blog/[slug]
  const blogPostMatch = pathname.match(/^\/(es|ca)\/blog\/(.+)$/);
  if (blogPostMatch) {
    linkHeader = BLOG_POST_LINK_MAP[pathname] || null;
  }
  // Check if this is a blog listing page: /[locale]/blog
  else if (pathname.match(/^\/(es|ca)\/blog$/)) {
    linkHeader = buildBlogLinkHeader();
  }
  // Check if this is a contact page: /[locale]/contacto or /[locale]/contacte
  else if (pathname.match(/^\/(es|ca)\/(contacto|contacte)$/)) {
    linkHeader = buildContactLinkHeader();
  }

  // If we have a Link header to set, modify the intl response
  if (linkHeader) {
    // Clone the response to modify headers
    const newResponse = intlResponse.clone();
    
    // Remove all existing Link headers
    newResponse.headers.delete('Link');
    
    // Set our correct Link header
    newResponse.headers.set('Link', linkHeader);
    
    return newResponse;
  }

  return intlResponse;
}

//Proxy executes for page routes: /es/blog/..., /ca/contacto, etc.
//Dynamic routes: /[locale]/blog/[slug]
//Does not execute for API routes: /api/*
//Static assets: /favicon.ico, /_next/static/..., /assets/...
//Next.js internals: /_next/*, /_vercel/*
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

