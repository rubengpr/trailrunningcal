import { describe, expect, it } from 'vitest';
import ca from '@/locales/ca/translation.json';
import en from '@/locales/en/translation.json';
import fr from '@/locales/fr/translation.json';
import es from '@/locales/es/translation.json';
import { blogLocales, localeTags, locales } from '@/i18n';
import {
  getContactPath,
  getLegalDocumentId,
  getLegalPath,
  getPublicBackofficeRedirectPath,
  getFavoritesPath,
  LEGAL_DOCUMENT_IDS,
} from '@/lib/i18n/paths';
import { buildLegalAlternateLinks } from '@/lib/content/alternate-links';

const PUBLIC_NAMESPACES = [
  'map',
  'filters',
  'layoutToggle',
  'months',
  'weekdays',
  'results',
  'race',
  'event',
  'difficulty',
  'category',
  'navigation',
  'favorites',
  'landing',
  'banner',
  'contact',
  'errors',
  'auth',
  'footer',
  'legal',
  'signUp',
  'signUpSuccess',
  'login',
  'passwordRecovery',
  'updatePassword',
  'proposeRace',
  'provincia',
  'notFound',
  'faq',
  'monthsFull',
  'distanceGroups',
  'featuredEvents',
] as const;

type Messages = Record<string, unknown>;

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { [prefix]: String(value) };
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return Object.entries(flatten(child, path));
    }),
  );
}

function placeholders(message: string): string[] {
  return [...new Set(
    [...message.matchAll(/\{+([A-Za-z][A-Za-z0-9_]*)/g)]
      .map((match) => match[1]),
  )].sort();
}

describe('public locale contract', () => {
  it('registers English and French for public pages but not for the blog', () => {
    expect(locales).toEqual(['es', 'ca', 'en', 'fr']);
    expect(blogLocales).toEqual(['es', 'ca']);
    expect(localeTags.en).toBe('en-GB');
    expect(localeTags.fr).toBe('fr-FR');
  });

  it('uses canonical public paths for contact and favourites', () => {
    expect(getContactPath('en')).toBe('/en/contact');
    expect(getFavoritesPath('en')).toBe('/en/my-events');
    expect(getContactPath('fr')).toBe('/fr/contact');
    expect(getFavoritesPath('fr')).toBe('/fr/mes-evenements');
  });

  it('maps every legal document to its localized public path', () => {
    const expectedPaths = {
      es: ['/es/aviso-legal', '/es/privacidad', '/es/cookies', '/es/condiciones-de-uso'],
      ca: ['/ca/avis-legal', '/ca/privacitat', '/ca/cookies', '/ca/condicions-us'],
      en: ['/en/legal-notice', '/en/privacy', '/en/cookies', '/en/terms-of-use'],
      fr: ['/fr/mentions-legales', '/fr/confidentialite', '/fr/cookies', '/fr/conditions-utilisation'],
    } as const;

    for (const locale of locales) {
      expect(
        LEGAL_DOCUMENT_IDS.map((documentId) => getLegalPath(locale, documentId)),
      ).toEqual(expectedPaths[locale]);
    }
  });

  it('only resolves legal slugs for the matching locale', () => {
    expect(getLegalDocumentId('es', 'privacidad')).toBe('privacy');
    expect(getLegalDocumentId('ca', 'privacitat')).toBe('privacy');
    expect(getLegalDocumentId('en', 'privacy')).toBe('privacy');
    expect(getLegalDocumentId('fr', 'confidentialite')).toBe('privacy');
    expect(getLegalDocumentId('es', 'privacy')).toBeNull();
    expect(getLegalDocumentId('fr', 'aviso-legal')).toBeNull();
    expect(getLegalDocumentId('en', 'unknown')).toBeNull();
  });

  it('builds legal alternate links with Spanish as x-default', () => {
    expect(buildLegalAlternateLinks('privacy')).toEqual({
      es: 'https://www.trailrunningcal.com/es/privacidad',
      ca: 'https://www.trailrunningcal.com/ca/privacitat',
      en: 'https://www.trailrunningcal.com/en/privacy',
      fr: 'https://www.trailrunningcal.com/fr/confidentialite',
      'x-default': 'https://www.trailrunningcal.com/es/privacidad',
    });
  });

  it('keeps public-only locales limited to public routes', () => {
    expect(getPublicBackofficeRedirectPath('/en/admin/eventos')).toBe(
      '/es/admin/eventos',
    );
    expect(getPublicBackofficeRedirectPath('/fr/org/perfil')).toBe(
      '/es/org/perfil',
    );
    expect(getPublicBackofficeRedirectPath('/fr/e/pedraforca-xtrail')).toBeNull();
  });

  it.each(PUBLIC_NAMESPACES)('fully translates the public %s namespace', (namespace) => {
    const source = flatten((es as Messages)[namespace]);
    const translation = flatten((en as Messages)[namespace]);

    expect(Object.keys(translation).sort()).toEqual(Object.keys(source).sort());

    for (const key of Object.keys(source)) {
      expect(placeholders(translation[key])).toEqual(placeholders(source[key]));
    }
  });

  it.each(PUBLIC_NAMESPACES)('fully translates the French public %s namespace', (namespace) => {
    const source = flatten((es as Messages)[namespace]);
    const translation = flatten((fr as Messages)[namespace]);

    expect(Object.keys(translation).sort()).toEqual(Object.keys(source).sort());

    for (const key of Object.keys(source)) {
      expect(placeholders(translation[key])).toEqual(placeholders(source[key]));
    }
  });

  it('keeps existing Spanish and Catalan catalogues parseable', () => {
    expect(Object.keys(es).length).toBeGreaterThan(0);
    expect(Object.keys(ca).length).toBeGreaterThan(0);
  });

  it('uses track terminology throughout the English catalogue', () => {
    expect(JSON.stringify(en)).not.toMatch(/courses?/i);
  });
});
