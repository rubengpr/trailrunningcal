import { describe, expect, it } from 'vitest';
import {
  assertPromotableEventTranslationArtifact,
  createEventTranslationArtifact,
  EventTranslationArtifactError,
  parseEventTranslationArtifact,
} from '@/lib/services/event-translation-artifact';

function createArtifact() {
  return createEventTranslationArtifact({
    locales: ['en'],
    expected: 1,
    entries: [{
      eventId: 'event-1',
      slug: 'event-one',
      locale: 'en',
      source: 'La prueba tiene 10 km. Mantiene un recorrido.\n\nLa organización ofrece agua y dorsal.',
      description: 'The event has 10 km. It keeps one route.\n\nThe organisers provide water and a race number.',
      validation: { valid: true },
      generatedAt: '2026-08-24T00:00:00.000Z',
    }],
    failures: [],
  });
}

describe('event translation artifacts', () => {
  it('parses and accepts a complete validated artifact', () => {
    const artifact = parseEventTranslationArtifact(createArtifact());
    expect(() => assertPromotableEventTranslationArtifact(artifact)).not.toThrow();
  });

  it('rejects duplicate event-locale pairs', () => {
    const artifact = createArtifact();
    artifact.expected = 2;
    artifact.entries.push({ ...artifact.entries[0] });

    expect(() => assertPromotableEventTranslationArtifact(artifact)).toThrow(
      EventTranslationArtifactError,
    );
  });

  it('rejects artifacts that include a failed translation', () => {
    const artifact = createArtifact();
    artifact.failures.push({
      eventId: 'event-2',
      slug: 'event-two',
      locale: 'en',
      attempts: 3,
      error: 'Translation has an invalid language',
      lastTranslation: null,
    });

    expect(() => assertPromotableEventTranslationArtifact(artifact)).toThrow(
      'Artifact contains failed translations',
    );
  });

  it('rejects an artifact missing one requested locale for an event', () => {
    const artifact = createEventTranslationArtifact({
      locales: ['ca', 'en'],
      expected: 1,
      entries: [{
        ...createArtifact().entries[0],
        locale: 'ca',
      }],
      failures: [],
    });

    expect(() => assertPromotableEventTranslationArtifact(artifact)).toThrow(
      'Artifact contains incomplete event locales',
    );
  });

  it('rejects malformed artifacts', () => {
    expect(() => parseEventTranslationArtifact({ version: 1 })).toThrow(
      EventTranslationArtifactError,
    );
  });
});
