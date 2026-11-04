import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-intl/middleware', () => ({
  default: () => vi.fn(),
}));

import proxy, { config } from './proxy';

function matches(url: string) {
  return unstable_doesMiddlewareMatch({
    config,
    nextConfig: {},
    url,
  });
}

describe('proxy matcher', () => {
  it.each(['/', '/es', '/ca', '/en', '/fr'])(
    'keeps locale negotiation for %s',
    (url) => {
      expect(matches(url)).toBe(true);
    },
  );

  it.each([
    '/en/admin',
    '/en/admin/eventos',
    '/en/org/perfil',
    '/fr/admin',
    '/fr/org/perfil',
  ])('keeps public-only locale redirects for %s', (url) => {
    expect(matches(url)).toBe(true);
  });

  it.each([
    '/es/e/zegama-aizkorri',
    '/ca/t/ultra-trail',
    '/en/d/cataluna/barcelona',
    '/fr/contact',
  ])('bypasses proxy for localized content route %s', (url) => {
    expect(matches(url)).toBe(false);
  });

  it.each([
    '/api/events',
    '/auth/callback',
    '/ingest/e',
    '/_next/static/chunk.js',
    '/_vercel/insights/script.js',
    '/favicon.ico',
  ])('continues to exclude infrastructure route %s', (url) => {
    expect(matches(url)).toBe(false);
  });

  it.each([
    '/ingest/static/web-vitals.js',
    '/ingest/static/toolbar.js',
    '/ingest/array/project-token/config.js',
    '/en/ingest/static/web-vitals.js',
    '/ca/ingest/array/project-token/config.js',
  ])('handles public analytics asset %s', (url) => {
    expect(matches(url)).toBe(true);
  });

  it.each(['/contact', '/e/zegama-aizkorri'])(
    'keeps locale redirects for unprefixed page %s',
    (url) => {
      expect(matches(url)).toBe(true);
    },
  );
});

describe('analytics asset proxy', () => {
  it.each(['/ingest', '/es/ingest', '/ca/ingest', '/en/ingest', '/fr/ingest'])(
    'preserves the asset URL while stripping browser headers for %s',
    async (prefix) => {
      const response = await proxy(new NextRequest(
        `http://localhost:3000${prefix}/static/web-vitals.js?v=1.347.2`,
        { headers: {
          cookie: 'session=private',
          authorization: 'Bearer private',
          'if-none-match': 'stale-validator',
        } },
      ));

      expect(response.headers.get('x-middleware-rewrite')).toBe(
        'https://eu-assets.i.posthog.com/static/web-vitals.js?v=1.347.2',
      );
      expect(response.headers.get('x-middleware-override-headers')).toBe('accept');
      expect(response.headers.get('x-middleware-request-accept')).toBe('*/*');
      expect(response.headers.get('x-middleware-request-cookie')).toBeNull();
      expect(response.headers.get('x-middleware-request-authorization')).toBeNull();
    },
  );
});
