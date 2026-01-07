import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { NextRequest } from 'next/server';

// Import blog link map (generated at build time)
// Use dynamic import with fallback for Edge Runtime compatibility
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

export default function middleware(request: NextRequest) {
  // Process request with intl middleware
  const response = intlMiddleware(request);

  // Don't modify redirects
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  // Check if this is a blog post route: /[locale]/blog/[slug]
  const pathname = request.nextUrl.pathname;
  const blogPostMatch = pathname.match(/^\/(es|ca)\/blog\/(.+)$/);

  if (blogPostMatch) {
    // Look up by pathname (works in both dev and production)
    const linkHeader = BLOG_POST_LINK_MAP[pathname];

    if (linkHeader) {
      // Clone the response to modify headers
      // intlMiddleware always returns NextResponse, so we can safely clone
      const newResponse = response.clone();

      // Remove existing Link headers and set correct one
      newResponse.headers.delete('Link');
      newResponse.headers.set('Link', linkHeader);

      return newResponse;
    }
  }

  return response;
}

//Middleware executes for page routes: /es/blog/..., /ca/contacto, etc.
//Dynamic routes: /[locale]/blog/[slug]
//Does not execute for API routes: /api/*
//Static assets: /favicon.ico, /_next/static/..., /assets/...
//Next.js internals: /_next/*, /_vercel/*
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
