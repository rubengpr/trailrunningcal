import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export default function proxy(request: NextRequest) {
  // Process request with intl middleware (handles locale routing)
  return intlMiddleware(request);
}

//Proxy executes for page routes: /es/blog/..., /ca/contacto, etc.
//Dynamic routes: /[locale]/blog/[slug]
//Does not execute for API routes: /api/*
//Static assets: /favicon.ico, /_next/static/..., /assets/...
//Next.js internals: /_next/*, /_vercel/*
export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
