import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl/middleware', () => ({
  default: () => vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: class NextResponse {},
}));

import { config } from './proxy';

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

  it.each(['/contact', '/e/zegama-aizkorri'])(
    'keeps locale redirects for unprefixed page %s',
    (url) => {
      expect(matches(url)).toBe(true);
    },
  );
});
