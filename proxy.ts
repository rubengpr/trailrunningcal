import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { getPublicBackofficeRedirectPath } from './lib/i18n/paths';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export default async function proxy(request: NextRequest) {
  const redirectPath = getPublicBackofficeRedirectPath(request.nextUrl.pathname);

  if (redirectPath) {
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url);
  }

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
