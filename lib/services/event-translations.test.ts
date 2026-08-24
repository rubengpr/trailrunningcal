import { describe, expect, it } from 'vitest';
import {
  buildEventDescriptionTranslationPrompt,
  buildEventDescriptionTranslationRetryPrompt,
} from '@/lib/prompts/event-description-public-translation-instructions';
import { validateEventTranslation } from '@/lib/services/event-translations';

const source =
  'La prueba se celebra el 4 de octubre de 2026 con un recorrido de 12,3 kilómetros y 500 metros de desnivel positivo. El Trail del Montseny mantiene dos modalidades para corredores de distintos niveles.\n\nLa organización ofrece avituallamientos y una bolsa del corredor. Las inscripciones cierran el 1 de octubre y el evento reúne a más de 700 participantes.';

describe('event description translations', () => {
  it('builds a target-specific prompt', () => {
    expect(
      buildEventDescriptionTranslationPrompt({ description: source, locale: 'fr' }),
    ).toContain('French (fr-FR)');
    expect(
      buildEventDescriptionTranslationPrompt({ description: source, locale: 'fr' }),
    ).toContain('do not spell numbers out as words');
    expect(
      buildEventDescriptionTranslationPrompt({ description: source, locale: 'fr' }),
    ).toContain('French ordinal notation');
    expect(
      buildEventDescriptionTranslationPrompt({ description: source, locale: 'en' }),
    ).toContain('"elevation gain"');
    expect(
      buildEventDescriptionTranslationPrompt({ description: source, locale: 'ca' }),
    ).toContain('"del 5 de juliol"');
    expect(
      buildEventDescriptionTranslationRetryPrompt({ description: source, locale: 'fr' }),
    ).toContain('correction attempt');
    expect(
      buildEventDescriptionTranslationRetryPrompt({ description: source, locale: 'fr' }),
    ).toContain('4, 2026, 12,3, 500');
  });

  it('accepts a valid two-paragraph English translation with matching numbers', () => {
    const translation =
      'The event takes place on 4 October 2026, with a 12.3-kilometre course and 500 metres of elevation gain. Trail del Montseny offers two options for runners of different abilities.\n\nThe organisers provide refreshment stations and a runner’s bag. Entries close on 1 October, and the event attracts more than 700 participants.';

    expect(validateEventTranslation({ source, translation, locale: 'en' })).toEqual({
      value: translation,
      error: null,
    });
  });

  it('rejects translations with a changed numeric value', () => {
    const translation =
      'The event takes place on 4 October 2026, with a 12.3-kilometre course and 600 metres of elevation gain. Trail del Montseny offers two options for runners of different abilities.\n\nThe organisers provide refreshment stations and a runner’s bag. Entries close on 1 October, and the event attracts more than 700 participants.';

    expect(validateEventTranslation({ source, translation, locale: 'en' }).error).toBe(
      'Translation does not preserve numeric values',
    );
  });

  it('accepts French thousands separators', () => {
    const translation =
      'L’événement a lieu le 4 octobre 2026, avec un parcours de 12,3 kilomètres et 500 mètres de dénivelé positif. Trail del Montseny propose deux options pour des coureurs de différents niveaux.\n\nLes organisateurs prévoient des ravitaillements et un sac coureur. Les inscriptions se terminent le 1er octobre et l’événement réunit plus de 700 participants.';

    expect(validateEventTranslation({ source, translation, locale: 'fr' })).toEqual({
      value: translation,
      error: null,
    });
  });

  it('accepts numeric ordinals introduced from source words', () => {
    const translation =
      'The 3rd edition takes place on 4 October 2026, with a 12.3-kilometre course and 500 metres of elevation gain. Trail del Montseny offers 2 options for runners of different abilities.\n\nThe organisers provide refreshment stations and a runner’s bag. Entries close on 1 October, and the event attracts more than 700 participants.';

    expect(validateEventTranslation({ source, translation, locale: 'en' })).toEqual({
      value: translation,
      error: null,
    });
  });

  it('rejects translations that do not contain two paragraphs', () => {
    expect(
      validateEventTranslation({
        source,
        translation: 'A short one-paragraph English description with 4 2026 12.3 500 1 700.',
        locale: 'en',
      }).error,
    ).toBe('Translation must contain exactly two paragraphs');
  });
});
