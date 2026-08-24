import { describe, expect, it } from 'vitest';
import { GOLDEN_TRANSLATIONS } from '@/lib/services/event-translation-golden-dataset';
import { validateGoldenEventTranslation } from '@/lib/services/event-translation-golden';

describe('event description golden translations', () => {
  it('keeps the approved CA, EN and FR reference translations valid', () => {
    expect(GOLDEN_TRANSLATIONS).toHaveLength(8);

    for (const event of GOLDEN_TRANSLATIONS) {
      for (const [locale, translation] of Object.entries(event.translations)) {
        expect(validateGoldenEventTranslation({
          slug: event.slug,
          source: event.source,
          translation,
          locale: locale as 'ca' | 'en' | 'fr',
        })).toEqual({ value: translation, error: null });
      }
    }
  });
});
