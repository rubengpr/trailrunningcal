import { franc } from 'franc';
import { createOpenAIClient } from '@/lib/integrations/openai/client';
import {
  buildEventDescriptionTranslationPrompt,
} from '@/lib/prompts/event-description-public-translation-instructions';
import type { EventTranslationLocale } from '@/types/event-translation.types';

const MODEL = 'gpt-5.4-nano';
const LANGUAGE_CODES: Record<EventTranslationLocale, string> = {
  ca: 'cat',
  en: 'eng',
  fr: 'fra',
};

function getEnglishOrdinal(value: string): string {
  const number = Number(value);
  const remainder = number % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  if (number % 10 === 1) return `${value}st`;
  if (number % 10 === 2) return `${value}nd`;
  if (number % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

export class EventTranslationValidationError extends Error {
  constructor(
    message: string,
    readonly translation: string,
  ) {
    super(message);
  }
}

function normalizeDescription(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function normalizeLocaleTerminology(
  value: string,
  locale: EventTranslationLocale,
): string {
  if (locale === 'ca') {
    return value
      .replace(/(\d+)\.ª/gu, '$1a')
      .replace(/(\d+)[º°é](?=\s|$)/gu, '$1è')
      .replace(/\bde l[’'](\d{1,2}) de\b/gu, 'del $1 de')
      .replace(/\bde l[’'](1\d|2\d|3[01])(?=\s+(?:al|a|i|,|\.|$))/gu, 'del $1');
  }

  if (locale === 'fr') {
    return value
      .replace(/(\d+)\.ª/gu, '$1e')
      .replace(/\bMarcha\b/gu, 'marche')
      .replace(/\b1 (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/giu, '1er $1')
      .replace(/\bSa édition\b/gu, 'Son édition')
      .replace(/\bun sac coureur\b/giu, 'un sac de coureur');
  }

  if (locale !== 'en') return value;

  return value
    .replace(/(\d+)[º°é](?=\s)/gu, (_, number: string) => getEnglishOrdinal(number))
    .replace(/\b(?:Parc|Parque) Natural del\b/gu, 'Natural Park of')
    .replace(/\b(?:Parc|Parque) Natural de la\b/gu, 'Natural Park of the')
    .replace(/\b(?:Parc|Parque) Natural\b/gu, 'Natural Park')
    .replace(/\bpositive elevation gain\b/giu, 'elevation gain')
    .replace(/(\d[\d.,\s]*m) positives?\b/giu, '$1 of elevation gain')
    .replace(/\bcounty atmosphere\b/giu, 'local atmosphere')
    .replace(/\bMarcha\b/gu, 'Walk');
}

function getNumbers(value: string): string[] {
  return value.match(/(?<![-\d])\d{1,3}(?:[., \u202f]\d{3})+|\d+(?:[.,]\d+)?/g)?.map((number) =>
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
  const value = normalizeLocaleTerminology(
    normalizeDescription(input.translation),
    input.locale,
  );
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
  additionalInstructions?: string[];
}): Promise<string> {
  const client = createOpenAIClient();
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [{
      role: 'user',
      content: buildEventDescriptionTranslationPrompt({
        description: input.source,
        locale: input.locale,
        additionalInstructions: input.additionalInstructions,
      }),
    }],
  });
  const translation = completion.choices[0]?.message?.content ?? '';
  const validation = validateEventTranslation({
    source: input.source,
    translation,
    locale: input.locale,
  });

  if (validation.value) return validation.value;
  throw new EventTranslationValidationError(
    validation.error ?? 'Invalid event translation',
    translation,
  );
}
