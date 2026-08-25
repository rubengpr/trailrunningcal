import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  translate: vi.fn(),
}));

vi.mock('@/lib/services/event-translations', () => ({
  EventTranslationValidationError: class EventTranslationValidationError extends Error {
    constructor(message: string, readonly translation: string) {
      super(message);
    }
  },
  translateEventDescription: mocks.translate,
  validateEventTranslation: vi.fn(),
}));

import {
  EventTranslationQualityError,
  generateValidatedEventTranslation,
  MAX_EVENT_TRANSLATION_ATTEMPTS,
} from './event-translation-generation';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('generateValidatedEventTranslation', () => {
  it('repairs a failed deterministic validation', async () => {
    mocks.translate
      .mockResolvedValueOnce('Invalid first translation')
      .mockResolvedValueOnce('Valid second translation');
    const validate = vi.fn()
      .mockReturnValueOnce({ value: null, error: 'Translation has an invalid language' })
      .mockReturnValueOnce({ value: 'Valid second translation', error: null });

    await expect(generateValidatedEventTranslation({
      source: 'Spanish description',
      locale: 'en',
      validate,
    })).resolves.toEqual({ description: 'Valid second translation', attempts: 2 });

    expect(mocks.translate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      additionalInstructions: undefined,
    }));
    expect(mocks.translate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      additionalInstructions: expect.arrayContaining([
        expect.stringContaining('Translation has an invalid language'),
      ]),
    }));
  });

  it('fails after the configured quality limit', async () => {
    mocks.translate.mockResolvedValue('Still invalid');

    await expect(generateValidatedEventTranslation({
      source: 'Spanish description',
      locale: 'fr',
      validate: () => ({ value: null, error: 'Translation is empty' }),
    })).rejects.toBeInstanceOf(EventTranslationQualityError);

    expect(mocks.translate).toHaveBeenCalledTimes(MAX_EVENT_TRANSLATION_ATTEMPTS);
  });
});
