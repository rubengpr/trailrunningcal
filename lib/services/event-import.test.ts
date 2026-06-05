import { afterEach, describe, expect, it, vi } from 'vitest';

import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import type { SpiderServiceResult } from '@/lib/integrations/spider-cloud/service';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

const mocks = vi.hoisted(() => ({
  scrapePage: vi.fn(),
  crawlSite: vi.fn(),
  extractFromMarkdown: vi.fn(),
  checkDuplicateEvents: vi.fn(),
}));

vi.mock('@/lib/integrations/spider-cloud/service', () => ({
  scrapePage: mocks.scrapePage,
  crawlSite: mocks.crawlSite,
}));

vi.mock('@/lib/integrations/openrouter/service', () => ({
  extractFromMarkdown: mocks.extractFromMarkdown,
}));

vi.mock('@/lib/guards/duplicate-events', () => ({
  checkDuplicateEvents: mocks.checkDuplicateEvents,
}));

import {
  processCrawlSite,
  processCrawlSiteExtract,
  processScrapePageExtract,
} from './event-import';

const MODEL = OPENROUTER_SCRAPE_MODEL_IDS[0];

function event(overrides: Partial<TrailEventAgentEvent> = {}): TrailEventAgentEvent {
  return {
    name: 'Trail Event',
    description: 'Event description',
    websiteUrl: 'https://example.com/event',
    ...overrides,
  };
}

function race(overrides: Partial<TrailEventAgentRace> = {}): TrailEventAgentRace {
  return {
    name: 'Trail Event - 21K',
    date: '2026-06-01',
    city: 'Barcelona',
    province: 'Barcelona',
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

function extractResult(
  races: TrailEventAgentRace[],
  errorMessage: string | null = null,
): OpenRouterServiceResult {
  const extractedEvent = races.length > 0 ? event() : null;
  return {
    event: extractedEvent,
    races,
    errorMessage,
    rawModelOutput: JSON.stringify({
      event: extractedEvent,
      races,
      errorMessage,
    }),
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

describe('processCrawlSiteExtract', () => {
  it('checks duplicate events, crawls, and returns event-shaped extraction', async () => {
    mocks.crawlSite.mockResolvedValue(scrapeResult('crawl markdown'));
    mocks.extractFromMarkdown.mockResolvedValue(extractResult([race()]));

    const result = await processCrawlSiteExtract({
      url: 'https://example.com/event',
      model: MODEL,
    });

    expect(mocks.checkDuplicateEvents).toHaveBeenCalledWith([
      'https://example.com/event',
    ]);
    expect(mocks.crawlSite).toHaveBeenCalledWith('https://example.com/event');
    expect(mocks.extractFromMarkdown).toHaveBeenCalledWith(
      'crawl markdown',
      MODEL,
    );
    expect(result.event).toEqual(event());
    expect(result.races).toEqual([race()]);
    expect(result.steps.map((step) => step.name)).toEqual([
      'crawlSite',
      'extract',
    ]);
  });
});

describe('processScrapePageExtract', () => {
  it('propagates event extraction error messages', async () => {
    const msg = 'La edición está cancelada.';
    mocks.scrapePage.mockResolvedValue(scrapeResult('single page markdown'));
    mocks.extractFromMarkdown.mockResolvedValue(extractResult([], msg));

    const result = await processScrapePageExtract({
      url: 'https://example.com/event',
      model: MODEL,
    });

    expect(result.event).toBeNull();
    expect(result.races).toEqual([]);
    expect(result.errorMessage).toBe(msg);
  });
});

describe('processCrawlSite', () => {
  it('returns markdown and page stats without extracting event data', async () => {
    mocks.crawlSite.mockResolvedValue(scrapeResult('crawl markdown'));

    const result = await processCrawlSite({
      url: 'https://example.com/event',
    });

    expect(result.event).toBeNull();
    expect(result.races).toEqual([]);
    expect(result.markdown).toBe('crawl markdown');
    expect(mocks.extractFromMarkdown).not.toHaveBeenCalled();
  });
});
