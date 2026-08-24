import type {
  EventTranslationCandidate,
  EventTranslationLocale,
} from '@/types/event-translation.types';

type CandidateRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type TranslationLocaleRow = {
  event_id: string;
  locale: EventTranslationLocale;
};

function hasExactlyTwoParagraphs(description: string): boolean {
  return description
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0).length === 2;
}

export function selectUntranslatedEventCandidates(input: {
  events: CandidateRow[];
  translations: TranslationLocaleRow[];
  locales: EventTranslationLocale[];
  limit: number;
}): EventTranslationCandidate[] {
  const existingLocales = new Map<string, Set<EventTranslationLocale>>();
  for (const translation of input.translations) {
    const locales = existingLocales.get(translation.event_id) ?? new Set<EventTranslationLocale>();
    locales.add(translation.locale);
    existingLocales.set(translation.event_id, locales);
  }

  return input.events.flatMap((event) => {
    const description = event.description?.trim();
    const existing = existingLocales.get(event.id);
    const hasExistingTranslation = input.locales.some((locale) => existing?.has(locale));
    return description && hasExactlyTwoParagraphs(description) && !hasExistingTranslation
      ? [{ id: event.id, slug: event.slug, name: event.name, description }]
      : [];
  }).slice(0, input.limit);
}
