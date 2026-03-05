import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { NextRequest, NextResponse } from 'next/server';

const INGEST_PATH = '/ingest';
const EU_POSTHOG_HOST = 'eu.i.posthog.com';
const EU_ASSETS_HOST = 'eu-assets.i.posthog.com';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

function isIngestPath(pathname: string): boolean {
  return (
    pathname === INGEST_PATH ||
    pathname.startsWith(`${INGEST_PATH}/`) ||
    pathname === '/es/ingest' ||
    pathname.startsWith('/es/ingest/') ||
    pathname === '/ca/ingest' ||
    pathname.startsWith('/ca/ingest/')
  );
}

async function handlePostHogProxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const isStatic = pathname.includes('/ingest/static/');
  const hostname = isStatic ? EU_ASSETS_HOST : EU_POSTHOG_HOST;

  const afterIngest = pathname.split('/ingest')[1] ?? '';
  const posthogPath = afterIngest.startsWith('/') ? afterIngest : `/${afterIngest}` || '/';
  const posthogUrl = new URL(
    posthogPath + request.nextUrl.search,
    `https://${hostname}`,
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('host', hostname);
  requestHeaders.delete('connection');

  const fetchOptions: RequestInit & { duplex?: string } = {
    method: request.method,
    headers: requestHeaders,
  };
  if (request.body) {
    fetchOptions.body = request.body;
    fetchOptions.duplex = 'half';
  }

  const proxyResponse = await fetch(posthogUrl.toString(), fetchOptions);

  return new NextResponse(proxyResponse.body, {
    status: proxyResponse.status,
    statusText: proxyResponse.statusText,
    headers: proxyResponse.headers,
  });
}

export default async function proxy(request: NextRequest) {
  if (isIngestPath(request.nextUrl.pathname)) {
    return handlePostHogProxy(request);
  }

  const response = intlMiddleware(request);

  if (response instanceof NextResponse) {
    response.headers.delete('link');
  }

  return response;
}

// Proxy executes for page routes and PostHog ingest
export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
