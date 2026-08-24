import type { EventTranslationLocale } from '@/types/event-translation.types';

const TARGET_LANGUAGES: Record<EventTranslationLocale, string> = {
  ca: 'Catalan (ca-ES)',
  en: 'British English (en-GB)',
  fr: 'French (fr-FR)',
};

const LOCALE_STYLE_RULES: Record<EventTranslationLocale, string[]> = {
  ca: [
    'Use standard central Catalan date grammar (for example, "del 5 de juliol", never "de l’5 de juliol").',
    'Use "desnivell positiu" for elevation gain and natural Catalan event terminology.',
  ],
  en: [
    'Use idiomatic British English trail-running terminology: "elevation gain", "aid stations" or "refreshment stations", and "walk" for a non-competitive hiking event where appropriate.',
    'Translate generic Spanish or Catalan administrative and geographic nouns (for example, "Ayuntamiento" → "Town Council" and "Parque Natural" → "Natural Park").',
  ],
  fr: [
    'Use idiomatic French trail-running terminology: "dénivelé positif", "ravitaillements", and "marche" for a non-competitive hiking event where appropriate.',
    'Use French ordinal notation (for example, "11e", never "11.ª") and translate generic Spanish or Catalan administrative and geographic nouns (for example, "Ayuntamiento" → "mairie" and "Parque Natural" → "parc naturel").',
  ],
};

export function buildEventDescriptionTranslationPrompt(input: {
  description: string;
  locale: EventTranslationLocale;
}): string {
  return `Translate this Spanish trail running event description into ${TARGET_LANGUAGES[input.locale]}.

Rules:
- Preserve every fact. Do not add, omit, infer, or rewrite information.
- Preserve all numbers, dates, distances, elevation figures, prices, event names, route names, organizer names, place names, brands, URLs, and quoted phrases.
- Preserve the proper-name portion of names, but translate generic descriptive words around it when that makes the target language natural. For example, keep a named route or event title intact, but translate words such as town council, natural park, street, walk, course, and municipality when they are not part of the proper name.
- Keep every numeric value written with digits; do not spell numbers out as words.
- Keep exactly the same two-paragraph structure.
- Use natural editorial language for a trail running calendar, without marketing claims or calls to action.
- ${LOCALE_STYLE_RULES[input.locale].join('\n- ')}
- Return only the translated description, with no title, notes, or Markdown.

Spanish description:
${input.description}`;
}

export function buildEventDescriptionTranslationRetryPrompt(input: {
  description: string;
  locale: EventTranslationLocale;
}): string {
  const numericValues = input.description.match(/\d+(?:[.,]\d+)?/g) ?? [];

  return `${buildEventDescriptionTranslationPrompt(input)}

This is a correction attempt. Respond entirely in ${TARGET_LANGUAGES[input.locale]} and verify the structure and terminology rules above. Verify every number against the Spanish description before responding. Preserve these numeric values in this exact order, using digits: ${numericValues.join(', ')}.`;
}
