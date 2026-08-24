import { franc } from 'franc';
import { createOpenAIClient } from '@/lib/integrations/openai/client';
import {
  buildEventDescriptionTranslationPrompt,
  buildEventDescriptionTranslationRetryPrompt,
} from '@/lib/prompts/event-description-public-translation-instructions';
import type { EventTranslationLocale } from '@/types/event-translation.types';

const MODEL = 'gpt-5.4-nano';
const LANGUAGE_CODES: Record<EventTranslationLocale, string> = {
  ca: 'cat',
  en: 'eng',
  fr: 'fra',
};

function normalizeDescription(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function getNumbers(value: string): string[] {
  return value.match(/\d{1,3}(?:[.,\s\u202f]\d{3})+|\d+(?:[.,]\d+)?/g)?.map((number) =>
    number.replace(/[.,\s\u202f]/g, ''),
  ) ?? [];
}

function preservesSourceNumbers(source: string, translation: string): boolean {
  const sourceNumbers = getNumbers(source);
  const translatedNumbers = getNumbers(translation);
  let translatedIndex = 0;

  return sourceNumbers.every((number) => {
    const foundIndex = translatedNumbers.indexOf(number, translatedIndex);
    if (foundIndex === -1) return false;
    translatedIndex = foundIndex + 1;
    return true;
  });
}

export function validateEventTranslation(input: {
  source: string;
  translation: string;
  locale: EventTranslationLocale;
}): { value: string | null; error: string | null } {
  const value = normalizeDescription(input.translation);
  const paragraphs = value.split('\n\n').filter(Boolean);

  if (!value) return { value: null, error: 'Translation is empty' };
  if (paragraphs.length !== 2) {
    return { value: null, error: 'Translation must contain exactly two paragraphs' };
  }
  if (
    franc(value, { only: ['cat', 'eng', 'fra', 'spa'] }) !==
    LANGUAGE_CODES[input.locale]
  ) {
    return { value: null, error: 'Translation has an invalid language' };
  }
  if (!preservesSourceNumbers(input.source, value)) {
    return { value: null, error: 'Translation does not preserve numeric values' };
  }

  return { value, error: null };
}

export async function translateEventDescription(input: {
  source: string;
  locale: EventTranslationLocale;
}): Promise<string> {
  const client = createOpenAIClient();
  const prompts = [
    buildEventDescriptionTranslationPrompt({
      description: input.source,
      locale: input.locale,
    }),
    buildEventDescriptionTranslationRetryPrompt({
      description: input.source,
      locale: input.locale,
    }),
  ];
  let lastError = 'Invalid event translation';

  for (const prompt of prompts) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });
    const translation = completion.choices[0]?.message?.content ?? '';
    const validation = validateEventTranslation({
      source: input.source,
      translation,
      locale: input.locale,
    });

    if (validation.value) return validation.value;
    lastError = validation.error ?? lastError;
  }

  throw new Error(lastError);
}
