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
      buildEventDescriptionTranslationPrompt({ description: source, locale: 'fr' }),
    ).toContain('never return Spanish sentences');
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

  it('adds a correction instruction when one is provided', () => {
    expect(
      buildEventDescriptionTranslationPrompt({
        description: source,
        locale: 'en',
        additionalInstructions: ['Use "elevation gain" and never "positive elevation gain".'],
      }),
    ).toContain('Use "elevation gain" and never "positive elevation gain".');
  });

  it('accepts a valid two-paragraph English translation with matching numbers', () => {
    const translation =
      'The event takes place on 4 October 2026, with a 12.3-kilometre course and 500 metres of elevation gain. Trail del Montseny offers two options for runners of different abilities.\n\nThe organisers provide refreshment stations and a runner’s bag. Entries close on 1 October, and the event attracts more than 700 participants.';

    expect(validateEventTranslation({ source, translation, locale: 'en' })).toEqual({
      value: translation,
      error: null,
    });
  });

  it('normalizes generic natural-park terminology while preserving its name', () => {
    const translation =
      'The event takes place on 4 October 2026, with a 12.3-kilometre course and 500 metres of elevation gain in the Parc Natural del Montseny. Trail del Montseny offers two options for runners of different abilities.\n\nThe organisers provide refreshment stations and a runner’s bag. Entries close on 1 October, and the event attracts more than 700 participants.';

    expect(validateEventTranslation({ source, translation, locale: 'en' })).toEqual({
      value:
        'The event takes place on 4 October 2026, with a 12.3-kilometre course and 500 metres of elevation gain in the Natural Park of Montseny. Trail del Montseny offers two options for runners of different abilities.\n\nThe organisers provide refreshment stations and a runner’s bag. Entries close on 1 October, and the event attracts more than 700 participants.',
      error: null,
    });
  });

  it('normalizes locale-specific ordinals and trail terminology', () => {
    const english =
      'The event takes place on 4 October 2026, with a 12.3-kilometre course and 500 m positive elevation gain. The Marcha is available to runners.\n\nThe organisers provide refreshment stations and a runner’s bag. Entries close on 1 October, and the event attracts more than 700 participants.';
    const catalan =
      'La prova celebra la seva 11.ª edició el 4 d’octubre de 2026, amb un recorregut de 12,3 quilòmetres i 500 metres de desnivell positiu. El Trail del Montseny manté dues modalitats.\n\nL’organització ofereix avituallaments i una bossa del corredor. Les inscripcions es tanquen l’1 d’octubre i l’esdeveniment reuneix més de 700 participants.';
    const french =
      'L’épreuve célèbre sa 11.ª édition le 4 octobre 2026, avec un parcours de 12,3 kilomètres et 500 mètres de dénivelé positif. Une Marcha est également proposée.\n\nL’organisation prévoit des ravitaillements et un sac coureur. Les inscriptions se terminent le 1er octobre et l’événement réunit plus de 700 participants.';

    expect(validateEventTranslation({ source, translation: english, locale: 'en' }).value).toContain(
      '500 m elevation gain. The Walk',
    );
    expect(validateEventTranslation({ source, translation: catalan, locale: 'ca' }).value).toContain(
      '11a edició',
    );
    expect(
      validateEventTranslation({
        source: source.replace('4 de octubre', '5 de julio'),
        translation: catalan.replace('4 d’octubre', 'de l’5 de juliol'),
        locale: 'ca',
      }).value,
    ).toContain('del 5 de juliol');
    expect(validateEventTranslation({ source, translation: french, locale: 'fr' }).value).toContain(
      '11e édition',
    );
    expect(validateEventTranslation({ source, translation: french, locale: 'fr' }).value).toContain(
      'Une marche est également proposée',
    );
  });

  it('normalizes locale defects found during the production pilot', () => {
    const catalanSource =
      'La prueba se celebrará del 13 al 15 de noviembre de 2026, dentro del 9 Circuit Trail Marina. Mantiene 2 recorridos de montaña para adultos.\n\nLa organización ofrece avituallamientos y fija una inscripción para cada modalidad.';
    const englishSource =
      'La prueba tiene un ambiente comarcal y un recorrido de 15 km con 650 m positivos. Ofrece 2 recorridos de montaña para adultos en el 9 Circuit.\n\nLa organización ofrece avituallamientos y fija una inscripción para cada modalidad.';
    const frenchSource =
      'La prueba se celebra el 1 de septiembre de 2026 con una bolsa del corredor para los participantes. Propone 2 recorridos de montaña para adultos.\n\nLa organización prevé avituallamientos y fija una tarifa para cada modalidad.';
    const catalan =
      'La prova se celebrarà de l’13 al 15 de novembre de 2026, dins del 9é Circuit Trail Marina. Manté 2 recorreguts de muntanya per a adults.\n\nL’organització ofereix avituallaments i fixa una inscripció per a cada modalitat.';
    const english =
      'The event has a county atmosphere and a 15 km route with 650 m positives. It offers 2 mountain routes for adults in the 9é Circuit.\n\nThe organisers provide refreshment stations and set an entry fee for each format.';
    const french =
      'Sa édition se déroule le 1 septembre 2026 avec un sac coureur pour les participants. Elle propose 2 parcours de montagne pour adultes.\n\nL’organisation prévoit des ravitaillements et fixe un tarif pour chaque formule.';

    expect(validateEventTranslation({ source: catalanSource, translation: catalan, locale: 'ca' }).value).toContain(
      'del 13 al 15 de novembre de 2026, dins del 9è Circuit Trail Marina',
    );
    expect(validateEventTranslation({ source: englishSource, translation: english, locale: 'en' }).value).toContain(
      'local atmosphere and a 15 km route with 650 m of elevation gain. It offers 2 mountain routes for adults in the 9th Circuit',
    );
    expect(validateEventTranslation({ source: frenchSource, translation: french, locale: 'fr' }).value).toContain(
      'Son édition se déroule le 1er septembre 2026 avec un sac de coureur',
    );
  });

  it('rejects translations with a changed numeric value', () => {
    const translation =
      'The event takes place on 4 October 2026, with a 12.3-kilometre course and 600 metres of elevation gain. Trail del Montseny offers two options for runners of different abilities.\n\nThe organisers provide refreshment stations and a runner’s bag. Entries close on 1 October, and the event attracts more than 700 participants.';

    expect(validateEventTranslation({ source, translation, locale: 'en' }).error).toBe(
      'Translation does not preserve numeric values',
    );
  });

  it('rejects translations that reorder preserved numeric values', () => {
    const orderedSource =
      'La prueba se celebra en 2026 en su 62.ª edición con salida a las 9:00 h. Mantiene un recorrido de montaña.\n\nEl recorrido tiene 9,1 km y 485 metros de desnivel para los participantes.';
    const reorderedTranslation =
      'The event celebrates its 62nd edition in 2026 with a 9:00 start. It keeps a mountain route.\n\nThe route has 9.1 km and 485 metres of elevation gain for participants.';

    expect(validateEventTranslation({
      source: orderedSource,
      translation: reorderedTranslation,
      locale: 'en',
    }).error).toBe('Translation does not preserve numeric values');
  });

  it('accepts French thousands separators', () => {
    const translation =
      'L’événement a lieu le 4 octobre 2026, avec un parcours de 12,3 kilomètres et 500 mètres de dénivelé positif. Trail del Montseny propose deux options pour des coureurs de différents niveaux.\n\nLes organisateurs prévoient des ravitaillements et un sac coureur. Les inscriptions se terminent le 1er octobre et l’événement réunit plus de 700 participants.';

    expect(validateEventTranslation({ source, translation, locale: 'fr' })).toEqual({
      value: translation.replace('un sac coureur', 'un sac de coureur'),
      error: null,
    });
  });

  it('does not merge a route label with a following numeric value', () => {
    const routeSource =
      'La prueba K-13 tiene 423 m de desnivel positivo y la distancia larga, 2.293 m, el 4 de octubre de 2026. El recorrido está señalizado para todos los participantes.\n\nLa organización fija un tiempo máximo de 4 horas y 30 minutos y ofrece avituallamientos durante la prueba.';
    const translation =
      'L’épreuve K-13 affiche 423 m de dénivelé positif et la longue distance, 2 293 m, le 4 octobre 2026. Le parcours est balisé pour tous les participants.\n\nL’organisation fixe un temps maximum de 4 heures et 30 minutes et prévoit des ravitaillements pendant l’épreuve.';

    expect(validateEventTranslation({ source: routeSource, translation, locale: 'fr' })).toEqual({
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
