import { afterEach, describe, expect, it, vi } from 'vitest';

import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import type { SpiderServiceResult } from '@/lib/integrations/spider-cloud/service';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import type { TrailRace } from '@/types/trail-race-agent.types';

const mocks = vi.hoisted(() => ({
  scrapePage: vi.fn(),
  crawlSite: vi.fn(),
  extractFromMarkdown: vi.fn(),
  checkDuplicateRaces: vi.fn(),
}));

vi.mock('@/lib/integrations/spider-cloud/service', () => ({
  scrapePage: mocks.scrapePage,
  crawlSite: mocks.crawlSite,
}));

vi.mock('@/lib/integrations/openrouter/service', () => ({
  extractFromMarkdown: mocks.extractFromMarkdown,
}));


vi.mock('@/lib/guards/duplicate-races', () => ({
  checkDuplicateRaces: mocks.checkDuplicateRaces,
}));

import {
  processCrawlSite,
  processCrawlSiteExtract,
  processScrapePage,
  processScrapePageExtract,
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
    usage: {
      totalCost: 0.00042,
    },
  };
}

function extractResult(
  races: TrailRace[],
  errorMessage: string | null = null,
): OpenRouterServiceResult {
  return {
    event: {
      name: 'Test event',
      description: null,
      websiteUrl: null,
    },
    races,
    errorMessage,
    rawModelOutput: JSON.stringify({ races }),
    usage: {
      promptTokens: 10,
      completionTokens: 5,
      reasoningTokens: null,
      totalTokens: 15,
      cost: 0.00014,
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
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

  it('propagates errorMessage from the extraction service when races is empty', async () => {
    const msg = 'La edición está cancelada.';
    mocks.crawlSite.mockResolvedValue(scrapeResult('crawl markdown'));
    mocks.extractFromMarkdown.mockResolvedValue(extractResult([], msg));

    const result = await processCrawlSiteExtract({
      url: 'https://example.com/race',
      model: MODEL,
    });

    expect(result.races).toEqual([]);
    expect(result.errorMessage).toBe(msg);
  });

  it('passes null errorMessage when races are found', async () => {
    mocks.crawlSite.mockResolvedValue(scrapeResult('crawl markdown'));
    mocks.extractFromMarkdown.mockResolvedValue(extractResult([race()], null));

    const result = await processCrawlSiteExtract({
      url: 'https://example.com/race',
      model: MODEL,
    });

    expect(result.races).toHaveLength(1);
    expect(result.errorMessage).toBeNull();
  });

});

describe('processScrapePageExtract', () => {
  it('scrapes a single page and extracts once', async () => {
    mocks.scrapePage.mockResolvedValue(scrapeResult('single page markdown'));
    mocks.extractFromMarkdown.mockResolvedValue(extractResult([race()]));

    const result = await processScrapePageExtract({
      url: 'https://example.com/race',
      model: MODEL,
    });

    expect(mocks.scrapePage).toHaveBeenCalledWith('https://example.com/race');
    expect(mocks.crawlSite).not.toHaveBeenCalled();
    expect(mocks.extractFromMarkdown).toHaveBeenCalledWith(
      'single page markdown',
      MODEL,
    );
    expect(result.workflow).toBe('scrapePageExtract');
    expect(result.fallbackUsed).toBeNull();
    expect(result.steps.map((step) => step.name)).toEqual([
      'scrapePage',
      'extract',
    ]);
  });

  it('propagates errorMessage from the extraction service when races is empty', async () => {
    const msg = 'Solo se encontraron pruebas infantiles.';
    mocks.scrapePage.mockResolvedValue(scrapeResult('single page markdown'));
    mocks.extractFromMarkdown.mockResolvedValue(extractResult([], msg));

    const result = await processScrapePageExtract({
      url: 'https://example.com/race',
      model: MODEL,
    });

    expect(result.races).toEqual([]);
    expect(result.errorMessage).toBe(msg);
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
    expect(result.errorMessage).toBeNull();
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
    expect(result.errorMessage).toBeNull();
    expect(result.rawModelOutput).toBeNull();
    expect(result.usage).toBeNull();
    expect(result.markdown).toBe('single page markdown');
    expect(result.steps.map((step) => step.name)).toEqual(['scrapePage']);
  });
});
