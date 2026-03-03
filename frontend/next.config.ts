import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
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
              "script-src 'self' 'unsafe-inline'",
              // Tailwind and component inline styles require unsafe-inline.
              "style-src 'self' 'unsafe-inline'",
              // Geist font is self-hosted by next/font at build time.
              "font-src 'self'",
              // Supabase storage for race/province/brand images. data: for Next.js blur placeholders.
              "img-src 'self' data: https://ppmdbmyxgtqvmvtbptmg.supabase.co",
              // Supabase JS client (auth + DB) connects directly from the browser.
              // PostHog ingest is proxied to self via rewrites.
              "connect-src 'self' https://ppmdbmyxgtqvmvtbptmg.supabase.co",
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

  // PostHog rewrites
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
