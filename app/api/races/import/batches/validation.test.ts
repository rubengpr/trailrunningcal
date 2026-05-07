import { describe, expect, it } from 'vitest';

import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import { parseBatchInput, ValidationError } from './validation';

const MODEL = OPENROUTER_SCRAPE_MODEL_IDS[0];

describe('parseBatchInput', () => {
  it('rejects non-object bodies', () => {
    expect(() => parseBatchInput(null)).toThrow(ValidationError);
  });

  it('requires at least one URL', () => {
    expect(() =>
      parseBatchInput({
        urls: [],
        model: MODEL,
      }),
    ).toThrow('At least one URL is required');
  });

  it('rejects invalid URLs', () => {
    expect(() =>
      parseBatchInput({
        urls: ['not a url'],
        model: MODEL,
      }),
    ).toThrow('Invalid URL format');
  });

  it('deduplicates and normalizes URLs', () => {
    expect(
      parseBatchInput({
        urls: ['trail.example/race', 'https://trail.example/race'],
        model: MODEL,
      }),
    ).toEqual({
      urls: ['https://trail.example/race'],
      model: MODEL,
    });
  });

  it('requires a model', () => {
    expect(() =>
      parseBatchInput({
        urls: ['https://trail.example/race'],
      }),
    ).toThrow('Model is required');
  });

  it('rejects invalid models', () => {
    expect(() =>
      parseBatchInput({
        urls: ['https://trail.example/race'],
        model: 'invalid-model',
      }),
    ).toThrow('Invalid model');
  });
});
