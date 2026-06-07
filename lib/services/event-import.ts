import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { extractFromMarkdown } from '@/lib/integrations/openrouter/service';
import { crawlSite, scrapePage } from '@/lib/integrations/spider-cloud/service';
import type { SpiderServiceResult } from '@/lib/integrations/spider-cloud/service';
import type {
  EventImportResult,
  EventImportStep,
  EventImportStepName,
} from '@/types/events-import-api.types';
import type { PageStats } from '@/types/races-scrape-api.types';
import { checkDuplicateEvents } from '@/lib/guards/duplicate-events';

export const EMPTY_PAGE_STATS: PageStats = {
  total: 0,
  successCount: 0,
  errorCount: 0,
};

interface TimedResult<T> {
  result: T;
  durationMs: number;
}

async function timeStep<T>(fn: () => Promise<T>): Promise<TimedResult<T>> {
  const startedAt = performance.now();
  const result = await fn();
  return {
    result,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

function scrapeStep(
  name: EventImportStepName,
  scrapeResult: SpiderServiceResult,
  durationMs: number,
): EventImportStep {
  return {
    name,
    status: 'success',
    durationMs,
    pageStats: scrapeResult.pageStats,
  };
}

function extractStep(raceCount: number, durationMs: number): EventImportStep {
  return {
    name: 'extract',
    status: raceCount > 0 ? 'success' : 'empty',
    durationMs,
  };
}

export async function processCrawlSiteExtract(input: {
  url: string;
  model: OpenRouterScrapeModelId;
}): Promise<EventImportResult> {
  await checkDuplicateEvents([input.url]);
  const crawl = await timeStep(() => crawlSite(input.url));
  const extract = await timeStep(() =>
    extractFromMarkdown(crawl.result.markdown, input.model),
  );

  return {
    workflow: 'crawlSiteExtract',
    url: input.url,
    event: extract.result.event,
    races: extract.result.races,
    errorMessage: extract.result.errorMessage,
    markdown: crawl.result.markdown,
    rawModelOutput: extract.result.rawModelOutput,
    usage: extract.result.usage,
    pageStats: crawl.result.pageStats,
    scrapeUsage: crawl.result.usage,
    fallbackUsed: null,
    steps: [
      scrapeStep('crawlSite', crawl.result, crawl.durationMs),
      extractStep(extract.result.races.length, extract.durationMs),
    ],
  };
}

export async function processScrapePageExtract(input: {
  url: string;
  model: OpenRouterScrapeModelId;
}): Promise<EventImportResult> {
  await checkDuplicateEvents([input.url]);
  const scrape = await timeStep(() => scrapePage(input.url));
  const extract = await timeStep(() =>
    extractFromMarkdown(scrape.result.markdown, input.model),
  );

  return {
    workflow: 'scrapePageExtract',
    url: input.url,
    event: extract.result.event,
    races: extract.result.races,
    errorMessage: extract.result.errorMessage,
    markdown: scrape.result.markdown,
    rawModelOutput: extract.result.rawModelOutput,
    usage: extract.result.usage,
    pageStats: scrape.result.pageStats,
    scrapeUsage: scrape.result.usage,
    fallbackUsed: null,
    steps: [
      scrapeStep('scrapePage', scrape.result, scrape.durationMs),
      extractStep(extract.result.races.length, extract.durationMs),
    ],
  };
}

export async function processCrawlSite(input: {
  url: string;
}): Promise<EventImportResult> {
  const crawl = await timeStep(() => crawlSite(input.url));

  return {
    workflow: 'crawlSite',
    url: input.url,
    event: null,
    races: [],
    errorMessage: null,
    markdown: crawl.result.markdown,
    rawModelOutput: null,
    usage: null,
    pageStats: crawl.result.pageStats,
    scrapeUsage: crawl.result.usage,
    fallbackUsed: null,
    steps: [scrapeStep('crawlSite', crawl.result, crawl.durationMs)],
  };
}

export async function processScrapePage(input: {
  url: string;
}): Promise<EventImportResult> {
  const scrape = await timeStep(() => scrapePage(input.url));

  return {
    workflow: 'scrapePage',
    url: input.url,
    event: null,
    races: [],
    errorMessage: null,
    markdown: scrape.result.markdown,
    rawModelOutput: null,
    usage: null,
    pageStats: scrape.result.pageStats,
    scrapeUsage: scrape.result.usage,
    fallbackUsed: null,
    steps: [scrapeStep('scrapePage', scrape.result, scrape.durationMs)],
  };
}
