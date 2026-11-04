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
  const assetPath = request.nextUrl.pathname.match(
    /^\/(?:es\/|ca\/|en\/|fr\/)?ingest\/(static|array)\/(.+)$/,
  );

  if (assetPath) {
    const url = new URL(`/${assetPath[1]}/${assetPath[2]}`, 'https://eu-assets.i.posthog.com');
    url.search = request.nextUrl.search;

    // Public SDK files do not need the browser's cookies, credentials or cache
    // validators. Keep those out of the request to the external asset server.
    return NextResponse.rewrite(url, {
      request: { headers: new Headers({ accept: '*/*' }) },
    });
  }

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

// Keep locale negotiation and the public-only locale redirects in Proxy, but let
// already-localized content routes go straight to the Vercel CDN/route handler.
// Public PostHog scripts use a header allowlist; ingestion uses Next rewrites.
export const config = {
  matcher: [
    '/',
    '/es',
    '/ca',
    '/en',
    '/fr',
    '/en/admin/:path*',
    '/en/org/:path*',
    '/fr/admin/:path*',
    '/fr/org/:path*',
    '/ingest/:asset(static|array)/:path*',
    '/:locale(es|ca|en|fr)/ingest/:asset(static|array)/:path*',
    '/((?!api|auth|ingest|_next|_vercel|es(?:/|$)|ca(?:/|$)|en(?:/|$)|fr(?:/|$)|.*\\..*).*)',
  ],
};
