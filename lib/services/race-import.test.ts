import { afterEach, describe, expect, it, vi } from 'vitest';

import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import type { SpiderServiceResult } from '@/lib/integrations/spider-cloud/service';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import type { TrailRace } from '@/types/trail-race-agent.types';

const mocks = vi.hoisted(() => ({
  scrapePage: vi.fn(),
  crawlSite: vi.fn(),
  extractFromMarkdown: vi.fn(),
}));

vi.mock('@/lib/integrations/spider-cloud/service', () => ({
  scrapePage: mocks.scrapePage,
  crawlSite: mocks.crawlSite,
}));

vi.mock('@/lib/integrations/openrouter/service', () => ({
  extractFromMarkdown: mocks.extractFromMarkdown,
}));

import {
  processAutopilot,
  processCrawlSite,
  processCrawlSiteExtract,
  processScrapePage,
} from './race-import';

const MODEL = OPENROUTER_SCRAPE_MODEL_IDS[0];

function race(overrides: Partial<TrailRace> = {}): TrailRace {
  return {
    name: 'Trail Race',
    date: '2026-06-01',
    city: 'Barcelona',
    province: 'Barcelona',
    description: 'Mountain race',
    distanceKm: 21,
    elevationGainM: 1000,
    ...overrides,
  };
}

function scrapeResult(markdown: string): SpiderServiceResult {
  return {
    markdown,
    pageStats: {
      total: 1,
      successCount: 1,
      errorCount: 0,
    },
  };
}

function extractResult(races: TrailRace[]): OpenRouterServiceResult {
  return {
    races,
    rawModelOutput: JSON.stringify({ races }),
    usage: {
      promptTokens: 10,
      completionTokens: 5,
      reasoningTokens: null,
      totalTokens: 15,
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('processAutopilot', () => {
  it('returns single-page races when the first extraction finds races', async () => {
    mocks.scrapePage.mockResolvedValue(scrapeResult('single page markdown'));
    mocks.extractFromMarkdown.mockResolvedValue(extractResult([race()]));

    const result = await processAutopilot({
      url: 'https://example.com/race',
      model: MODEL,
    });

    expect(mocks.scrapePage).toHaveBeenCalledWith('https://example.com/race');
    expect(mocks.extractFromMarkdown).toHaveBeenCalledWith(
      'single page markdown',
      MODEL,
    );
    expect(mocks.crawlSite).not.toHaveBeenCalled();
    expect(result.fallbackUsed).toBe(false);
    expect(result.races).toHaveLength(1);
    expect(result.markdown).toBe('single page markdown');
    expect(result.steps.map((step) => step.name)).toEqual([
      'scrapePage',
      'extract',
    ]);
  });

  it('falls back to full crawl when single-page extraction is empty', async () => {
    mocks.scrapePage.mockResolvedValue(scrapeResult('single page markdown'));
    mocks.crawlSite.mockResolvedValue(scrapeResult('full crawl markdown'));
    mocks.extractFromMarkdown
      .mockResolvedValueOnce(extractResult([]))
      .mockResolvedValueOnce(extractResult([race({ name: 'Fallback Race' })]));

    const result = await processAutopilot({
      url: 'https://example.com/race',
      model: MODEL,
    });

    expect(mocks.crawlSite).toHaveBeenCalledWith('https://example.com/race');
    expect(mocks.extractFromMarkdown).toHaveBeenNthCalledWith(
      2,
      'full crawl markdown',
      MODEL,
    );
    expect(result.fallbackUsed).toBe(true);
    expect(result.races[0].name).toBe('Fallback Race');
    expect(result.markdown).toBe('full crawl markdown');
    expect(result.steps.map((step) => `${step.name}:${step.status}`)).toEqual([
      'scrapePage:success',
      'extract:empty',
      'crawlSite:success',
      'extract:success',
    ]);
  });
});

describe('processCrawlSiteExtract', () => {
  it('crawls and extracts once', async () => {
    mocks.crawlSite.mockResolvedValue(scrapeResult('crawl markdown'));
    mocks.extractFromMarkdown.mockResolvedValue(extractResult([race()]));

    const result = await processCrawlSiteExtract({
      url: 'https://example.com/race',
      model: MODEL,
    });

    expect(mocks.crawlSite).toHaveBeenCalledOnce();
    expect(mocks.extractFromMarkdown).toHaveBeenCalledOnce();
    expect(result.workflow).toBe('crawlSiteExtract');
    expect(result.fallbackUsed).toBeNull();
    expect(result.steps.map((step) => step.name)).toEqual([
      'crawlSite',
      'extract',
    ]);
  });
});

describe('processCrawlSite', () => {
  it('returns markdown and page stats without extracting races', async () => {
    mocks.crawlSite.mockResolvedValue(scrapeResult('crawl markdown'));

    const result = await processCrawlSite({
      url: 'https://example.com/race',
    });

    expect(mocks.crawlSite).toHaveBeenCalledWith('https://example.com/race');
    expect(mocks.extractFromMarkdown).not.toHaveBeenCalled();
    expect(result.workflow).toBe('crawlSite');
    expect(result.races).toEqual([]);
    expect(result.rawModelOutput).toBeNull();
    expect(result.usage).toBeNull();
    expect(result.markdown).toBe('crawl markdown');
  });
});

describe('processScrapePage', () => {
  it('returns markdown and page stats from a single-page scrape', async () => {
    mocks.scrapePage.mockResolvedValue(scrapeResult('single page markdown'));

    const result = await processScrapePage({
      url: 'https://example.com/race',
    });

    expect(mocks.scrapePage).toHaveBeenCalledWith('https://example.com/race');
    expect(mocks.crawlSite).not.toHaveBeenCalled();
    expect(mocks.extractFromMarkdown).not.toHaveBeenCalled();
    expect(result.workflow).toBe('scrapePage');
    expect(result.races).toEqual([]);
    expect(result.rawModelOutput).toBeNull();
    expect(result.usage).toBeNull();
    expect(result.markdown).toBe('single page markdown');
    expect(result.steps.map((step) => step.name)).toEqual(['scrapePage']);
  });
});
