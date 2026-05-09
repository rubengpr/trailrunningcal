import { describe, expect, it } from 'vitest';

import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import { parseInput, ValidationError } from './validation';

const MODEL = OPENROUTER_SCRAPE_MODEL_IDS[0];

describe('parseInput', () => {
  it('rejects non-object bodies', () => {
    expect(() => parseInput(null)).toThrow(ValidationError);
  });

  it('rejects invalid workflows', () => {
    expect(() =>
      parseInput({
        workflow: 'unknown',
        websiteUrl: 'https://example.com',
        model: MODEL,
      }),
    ).toThrow('Invalid workflow');
  });

  it('requires a website URL', () => {
    expect(() =>
      parseInput({
        workflow: 'crawlSite',
        websiteUrl: '',
      }),
    ).toThrow('Website URL is required');
  });

  it('rejects invalid URLs', () => {
    expect(() =>
      parseInput({
        workflow: 'crawlSite',
        websiteUrl: 'not a url',
      }),
    ).toThrow('Invalid URL format');
  });

  it('normalizes URLs', () => {
    expect(
      parseInput({
        workflow: 'crawlSite',
        websiteUrl: 'example.com/race',
      }),
    ).toEqual({
      workflow: 'crawlSite',
      url: 'https://example.com/race',
    });
  });

  it('accepts scrape page without a model', () => {
    expect(
      parseInput({
        workflow: 'scrapePage',
        websiteUrl: 'example.com/race',
      }),
    ).toEqual({
      workflow: 'scrapePage',
      url: 'https://example.com/race',
    });
  });

  it('requires a model for crawl and extract', () => {
    expect(() =>
      parseInput({
        workflow: 'crawlSiteExtract',
        websiteUrl: 'https://example.com',
      }),
    ).toThrow('Model is required');
  });

  it('requires a model for scrape page and extract', () => {
    expect(() =>
      parseInput({
        workflow: 'scrapePageExtract',
        websiteUrl: 'https://example.com',
      }),
    ).toThrow('Model is required');
  });

  it('rejects invalid models', () => {
    expect(() =>
      parseInput({
        workflow: 'crawlSiteExtract',
        websiteUrl: 'https://example.com',
        model: 'invalid-model',
      }),
    ).toThrow('Invalid model');
  });

  it('returns validated crawl site extract input', () => {
    expect(
      parseInput({
        workflow: 'crawlSiteExtract',
        websiteUrl: 'trail.example/race',
        model: MODEL,
      }),
    ).toEqual({
      workflow: 'crawlSiteExtract',
      url: 'https://trail.example/race',
      model: MODEL,
    });
  });

  it('returns validated scrape page extraction input', () => {
    expect(
      parseInput({
        workflow: 'scrapePageExtract',
        websiteUrl: 'trail.example/race',
        model: MODEL,
      }),
    ).toEqual({
      workflow: 'scrapePageExtract',
      url: 'https://trail.example/race',
      model: MODEL,
    });
  });
});
