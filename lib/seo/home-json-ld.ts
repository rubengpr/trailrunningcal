import { BASE_URL, CONTACT_EMAIL } from '@/lib/config';
import { SITE_NAME } from '@/seo/meta-config';

const LOGO_URL = 'https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/brand/logos/trc-logo.svg';

export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    inLanguage: ['es-ES', 'ca-ES'],
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
    },
  };
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: CONTACT_EMAIL,
      contactType: 'customer service',
      availableLanguage: ['Spanish', 'Catalan'],
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Cataluña',
      containedInPlace: {
        '@type': 'Country',
        name: 'España',
      },
    },
  };
}


