import {
  GOLDEN_TRANSLATION_RULES,
  GOLDEN_TRANSLATIONS,
} from '@/lib/services/event-translation-golden-dataset';
import { validateEventTranslation } from '@/lib/services/event-translations';
import type { EventTranslationLocale } from '@/types/event-translation.types';

export function validateGoldenEventTranslation(input: {
  slug: string;
  source: string;
  translation: string;
  locale: EventTranslationLocale;
}): { value: string | null; error: string | null } {
  const validation = validateEventTranslation(input);
  if (!validation.value) return validation;

  const rules = GOLDEN_TRANSLATION_RULES[input.slug]?.[input.locale];
  if (!rules) return validation;

  const lowerCaseTranslation = validation.value.toLocaleLowerCase(input.locale);
  const missingTerm = rules.required.find(
    (term) => !lowerCaseTranslation.includes(term.toLocaleLowerCase(input.locale)),
  );
  if (missingTerm) {
    return { value: null, error: `Translation is missing required term: ${missingTerm}` };
  }

  const forbiddenTerm = rules.forbidden.find((term) =>
    lowerCaseTranslation.includes(term.toLocaleLowerCase(input.locale)),
  );
  if (forbiddenTerm) {
    return { value: null, error: `Translation contains forbidden term: ${forbiddenTerm}` };
  }

  return validation;
}

export function getGoldenTranslationCases(): Array<{
  slug: string;
  source: string;
  locale: EventTranslationLocale;
}> {
  return GOLDEN_TRANSLATIONS.flatMap((event) =>
    (Object.keys(event.translations) as EventTranslationLocale[]).map((locale) => ({
      slug: event.slug,
      source: event.source,
      locale,
    })),
  );
}
