import { describe, expect, it, vi } from 'vitest';
import { createOpenAIClient } from '@/lib/integrations/openai/client';
import { createEventTranslationArtifact } from '@/lib/services/event-translation-artifact';
import {
  EventTranslationPromotionError,
  promoteEventTranslationArtifact,
} from '@/lib/services/event-translation-promotion';

vi.mock('@/lib/integrations/openai/client', () => ({
  createOpenAIClient: vi.fn(),
}));

const source =
  'La prueba tendrá 10 km y 500 m de desnivel positivo en 2026. Mantiene un recorrido de montaña.\n\nLa organización ofrece avituallamientos y dorsal para 2 categorías.';
const description =
  'The event will have 10 km and 500 m of elevation gain in 2026. It keeps one mountain route.\n\nThe organisers provide refreshment stations and a race number for 2 categories.';

function createArtifact() {
  return createEventTranslationArtifact({
    locales: ['en'],
    expected: 1,
    entries: [{
      eventId: 'event-1',
      slug: 'event-one',
      locale: 'en',
      source,
      description,
      validation: { valid: true },
      generatedAt: '2026-08-24T00:00:00.000Z',
    }],
    failures: [],
  });
}

function createDependencies(overrides = {}) {
  return {
    getEvents: vi.fn().mockResolvedValue([{ id: 'event-1', slug: 'event-one', name: 'Event one', description: source }]),
    saveTranslations: vi.fn().mockResolvedValue([]),
    getPersistedTranslations: vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        eventId: 'event-1', locale: 'en', description, createdAt: '', updatedAt: '',
      }]),
    revalidate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('event translation promotion', () => {
  it('promotes an exact valid artifact without an OpenAI dependency', async () => {
    const dependencies = createDependencies();

    await expect(promoteEventTranslationArtifact({ artifact: createArtifact(), dependencies })).resolves.toMatchObject({
      persisted: 1,
      slugs: ['event-one'],
    });
    expect(dependencies.saveTranslations).toHaveBeenCalledTimes(1);
    expect(dependencies.revalidate).toHaveBeenCalledWith(['event-one']);
    expect(createOpenAIClient).not.toHaveBeenCalled();
  });

  it('blocks stale source data before any write', async () => {
    const dependencies = createDependencies({
      getEvents: vi.fn().mockResolvedValue([{ id: 'event-1', slug: 'event-one', name: 'Event one', description: `${source} Changed.` }]),
    });

    await expect(promoteEventTranslationArtifact({ artifact: createArtifact(), dependencies })).rejects.toThrow(
      EventTranslationPromotionError,
    );
    expect(dependencies.saveTranslations).not.toHaveBeenCalled();
  });

  it('blocks invalid translations before any write', async () => {
    const artifact = createArtifact();
    artifact.entries[0].description = 'Texto en español con 10 km y 500 m en 2026.\n\nTexto para 2 categorías.';
    const dependencies = createDependencies();

    await expect(promoteEventTranslationArtifact({ artifact, dependencies })).rejects.toThrow(
      EventTranslationPromotionError,
    );
    expect(dependencies.saveTranslations).not.toHaveBeenCalled();
  });

  it('blocks existing translations before any write', async () => {
    const dependencies = createDependencies({
      getPersistedTranslations: vi.fn().mockResolvedValue([{
        eventId: 'event-1', locale: 'en', description, createdAt: '', updatedAt: '',
      }]),
    });

    await expect(promoteEventTranslationArtifact({ artifact: createArtifact(), dependencies })).rejects.toThrow(
      'Artifact would overwrite existing translations',
    );
    expect(dependencies.saveTranslations).not.toHaveBeenCalled();
  });
});
