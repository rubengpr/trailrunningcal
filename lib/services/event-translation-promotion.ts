import {
  assertPromotableEventTranslationArtifact,
  type EventTranslationArtifact,
} from '@/lib/services/event-translation-artifact';
import { validateEventTranslation } from '@/lib/services/event-translations';
import type {
  EventTranslation,
  EventTranslationCandidate,
  EventTranslationLocale,
} from '@/types/event-translation.types';

type PromotionDependencies = {
  getEvents: (eventIds: string[]) => Promise<EventTranslationCandidate[]>;
  saveTranslations: (entries: Array<{
    eventId: string;
    locale: EventTranslationLocale;
    description: string;
  }>) => Promise<EventTranslation[]>;
  getPersistedTranslations: (input: {
    eventIds: string[];
    locales: EventTranslationLocale[];
  }) => Promise<EventTranslation[]>;
  revalidate: (slugs: string[]) => Promise<void>;
};

export class EventTranslationPromotionError extends Error {}

export async function promoteEventTranslationArtifact(input: {
  artifact: EventTranslationArtifact;
  dependencies: PromotionDependencies;
}): Promise<{ batchId: string; persisted: number; slugs: string[] }> {
  const { artifact, dependencies } = input;
  assertPromotableEventTranslationArtifact(artifact);

  const eventIds = [...new Set(artifact.entries.map((entry) => entry.eventId))];
  const events = await dependencies.getEvents(eventIds);
  if (events.length !== eventIds.length) {
    throw new EventTranslationPromotionError('Artifact references missing or ineligible events');
  }
  const eventsById = new Map(events.map((event) => [event.id, event]));

  for (const entry of artifact.entries) {
    const event = eventsById.get(entry.eventId);
    if (!event || event.slug !== entry.slug || event.description !== entry.source) {
      throw new EventTranslationPromotionError('Artifact source is stale');
    }
    const validation = validateEventTranslation({
      source: entry.source,
      translation: entry.description,
      locale: entry.locale,
    });
    if (!validation.value || validation.value !== entry.description) {
      throw new EventTranslationPromotionError(
        `Artifact translation failed validation: ${validation.error ?? 'normalization changed output'}`,
      );
    }
  }

  const existing = await dependencies.getPersistedTranslations({
    eventIds,
    locales: artifact.locales,
  });
  if (existing.length > 0) {
    throw new EventTranslationPromotionError('Artifact would overwrite existing translations');
  }

  await dependencies.saveTranslations(
    artifact.entries.map((entry) => ({
      eventId: entry.eventId,
      locale: entry.locale,
      description: entry.description,
    })),
  );

  const persisted = await dependencies.getPersistedTranslations({
    eventIds,
    locales: artifact.locales,
  });
  const persistedByPair = new Map(
    persisted.map((translation) => [
      `${translation.eventId}:${translation.locale}`,
      translation.description,
    ]),
  );
  for (const entry of artifact.entries) {
    if (persistedByPair.get(`${entry.eventId}:${entry.locale}`) !== entry.description) {
      throw new EventTranslationPromotionError('Persisted translations do not match the artifact');
    }
  }

  const slugs = [...new Set(artifact.entries.map((entry) => entry.slug))];
  await dependencies.revalidate(slugs);

  return { batchId: artifact.batchId, persisted: artifact.entries.length, slugs };
}
