import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export default function proxy(request: NextRequest) {
  // Process request with intl middleware (handles locale routing)
  const response = intlMiddleware(request);
  
  // Remove Link headers (HTTP headers) while keeping HTML <link> tags
  if (response instanceof NextResponse) {
    response.headers.delete('link');
  }
  
  return response;
}

//Proxy executes for page routes: /es/blog/..., /ca/contacto, etc.
//Dynamic routes: /[locale]/blog/[slug]
//Does not execute for API routes: /api/*
//Static assets: /favicon.ico, /_next/static/..., /assets/...
//Next.js internals: /_next/*, /_vercel/*
export const config = {
  // Exclude ingest so PostHog proxy rewrites can match before middleware
  matcher: ['/((?!api|auth|_next|_vercel|ingest|.*\\..*).*)'],
};
