import { describe, expect, it } from 'vitest';
import ca from '@/locales/ca/translation.json';
import en from '@/locales/en/translation.json';
import es from '@/locales/es/translation.json';
import { blogLocales, localeTags, locales } from '@/i18n';
import {
  getContactPath,
  getEnglishBackofficeRedirectPath,
  getFavoritesPath,
} from '@/lib/i18n/paths';

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

describe('English locale contract', () => {
  it('registers English for public pages but not for the blog', () => {
    expect(locales).toEqual(['es', 'ca', 'en']);
    expect(blogLocales).toEqual(['es', 'ca']);
    expect(localeTags.en).toBe('en-GB');
  });

  it('uses canonical English paths for contact and favourites', () => {
    expect(getContactPath('en')).toBe('/en/contact');
    expect(getFavoritesPath('en')).toBe('/en/my-events');
  });

  it('keeps English limited to public routes', () => {
    expect(getEnglishBackofficeRedirectPath('/en/admin/eventos')).toBe(
      '/es/admin/eventos',
    );
    expect(getEnglishBackofficeRedirectPath('/en/org/perfil')).toBe(
      '/es/org/perfil',
    );
    expect(getEnglishBackofficeRedirectPath('/en/e/pedraforca-xtrail')).toBeNull();
  });

  it.each(PUBLIC_NAMESPACES)('fully translates the public %s namespace', (namespace) => {
    const source = flatten((es as Messages)[namespace]);
    const translation = flatten((en as Messages)[namespace]);

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
