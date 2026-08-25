import {
  EventTranslationValidationError,
  translateEventDescription,
  validateEventTranslation,
} from '@/lib/services/event-translations';
import type { EventTranslationLocale } from '@/types/event-translation.types';

export const MAX_EVENT_TRANSLATION_ATTEMPTS = 3;

export class EventTranslationQualityError extends Error {
  constructor(
    message: string,
    readonly lastTranslation: string | null,
  ) {
    super(message);
  }
}

function getRepairInstructions(input: {
  attempt: number;
  error: string;
  locale: EventTranslationLocale;
  lastTranslation: string | null;
}): string[] {
  const instructions = [
    `This is quality repair attempt ${input.attempt}. The previous output failed this check: ${input.error}. Correct that issue while preserving every other fact and the exact two-paragraph structure.`,
  ];
  const missingTerm = input.error.match(/^Translation is missing required term: (.+)$/u)?.[1];
  if (missingTerm) {
    instructions.push(`The final description must include this exact target-language phrase: "${missingTerm}".`);
  }
  if (input.error === 'Translation has an invalid language') {
    instructions.push(`Return every complete sentence in ${input.locale}; do not return Spanish sentences. Keep only proper names unchanged.`);
  }
  if (input.lastTranslation) {
    instructions.push(`Do not repeat this invalid previous output:\n${input.lastTranslation}`);
  }
  return instructions;
}

export async function generateValidatedEventTranslation(input: {
  source: string;
  locale: EventTranslationLocale;
  validate?: (input: {
    source: string;
    translation: string;
    locale: EventTranslationLocale;
  }) => { value: string | null; error: string | null };
}): Promise<{ description: string; attempts: number }> {
  const validate = input.validate ?? validateEventTranslation;
  let error = 'Translation did not pass the quality gate';
  let lastTranslation: string | null = null;

  for (let attempt = 1; attempt <= MAX_EVENT_TRANSLATION_ATTEMPTS; attempt += 1) {
    try {
      const translation = await translateEventDescription({
        source: input.source,
        locale: input.locale,
        additionalInstructions: attempt === 1
          ? undefined
          : getRepairInstructions({ attempt, error, locale: input.locale, lastTranslation }),
      });
      lastTranslation = translation;
      const validation = validate({ source: input.source, translation, locale: input.locale });
      if (validation.value) return { description: validation.value, attempts: attempt };
      error = validation.error ?? error;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Unknown translation error';
      if (caught instanceof EventTranslationValidationError) lastTranslation = caught.translation;
    }
  }

  throw new EventTranslationQualityError(error, lastTranslation);
}
