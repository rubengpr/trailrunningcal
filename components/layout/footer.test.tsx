import { createTranslator } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { Footer } from '@/components/layout/footer';
import en from '@/locales/en/translation.json';
import fr from '@/locales/fr/translation.json';

const { getLocale } = vi.hoisted(() => ({ getLocale: vi.fn<() => 'en' | 'fr'>() }));

vi.mock('next-intl/server', () => ({
  getLocale,
  getTranslations: async (namespace: 'footer' | 'navigation' | 'provincia.names' | 'geography.regions' | 'legal') => {
    const locale = getLocale();
    return createTranslator({
      locale,
      messages: locale === 'en' ? en : fr,
      namespace,
      onError: (error) => {
        throw error;
      },
    });
  },
}));

it.each([
  ['en', en.footer.blogPosts.bestRacesSpain],
  ['fr', fr.footer.blogPosts.bestRacesSpain],
] as const)('renders translated and untranslated blog titles in the %s footer', async (locale, translatedTitle) => {
  getLocale.mockReturnValue(locale);

  const html = renderToStaticMarkup(await Footer());

  expect(html).toContain('href="/es/blog/mejores-carreras-trail-running-andalucia"');
  expect(html).toContain('5 carreras trail en Andalucía');
  expect(html).toContain(translatedTitle);
});
