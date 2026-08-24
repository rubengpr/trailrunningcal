export const EVENT_TRANSLATION_LOCALES = ['ca', 'en', 'fr'] as const;

export type EventTranslationLocale =
  (typeof EVENT_TRANSLATION_LOCALES)[number];

export interface EventTranslation {
  eventId: string;
  locale: EventTranslationLocale;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventTranslationCandidate {
  id: string;
  slug: string;
  name: string;
  description: string;
}
