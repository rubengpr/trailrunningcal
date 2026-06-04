import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  if (response instanceof NextResponse) {
    response.headers.delete('link');
  }

  return response;
}

// Proxy executes for page routes; PostHog ingest is handled by Next rewrites.
export const config = {
  matcher: ['/((?!api|auth|ingest|_next|_vercel|.*\\..*).*)'],
};
