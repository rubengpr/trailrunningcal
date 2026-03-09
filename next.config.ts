import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],

  images: {
    minimumCacheTTL: 2678400,
    qualities: [75],
    formats: ['image/webp'],
    imageSizes: [32, 48, 96, 128, 256],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : 'https://ppmdbmyxgtqvmvtbptmg.supabase.co';

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js hydration + JSON-LD inline scripts require unsafe-inline.
              // PostHog is proxied via /ingest/* rewrites so no external origin needed.
              // Cloudflare Web Analytics beacon is injected automatically by Cloudflare.
              "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
              // Tailwind and component inline styles require unsafe-inline.
              "style-src 'self' 'unsafe-inline'",
              // Geist font is self-hosted by next/font at build time.
              "font-src 'self'",
              // Supabase storage for race/province/brand images. data: for Next.js blur placeholders.
              `img-src 'self' data: ${supabaseHost}`,
              // Supabase JS client (auth + DB) connects directly from the browser.
              // PostHog ingest is proxied to self via rewrites.
              `connect-src 'self' ${supabaseHost}`,
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // PostHog rewrites (EU region) — static assets first, then catch-all
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      // Locale-prefixed paths (next-intl with localePrefix: 'always')
      {
        source: '/:locale(es|ca)/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/:locale(es|ca)/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ];
  },

  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

const withMDX = createMDX({
  // No plugins - removed to fix Turbopack serialization error
});

// Apply MDX and next-intl plugins to Next.js config
export default withNextIntl(withMDX(nextConfig));
