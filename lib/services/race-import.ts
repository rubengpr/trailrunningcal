import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { extractFromMarkdown } from '@/lib/integrations/openrouter/service';
import { crawlSite, scrapePage } from '@/lib/integrations/spider-cloud/service';
import type { SpiderServiceResult } from '@/lib/integrations/spider-cloud/service';
import type {
  RaceImportResult,
  RaceImportStep,
  RaceImportStepName,
} from '@/types/races-import-api.types';

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
  name: RaceImportStepName,
  scrapeResult: SpiderServiceResult,
  durationMs: number,
): RaceImportStep {
  return {
    name,
    status: 'success',
    durationMs,
    pageStats: scrapeResult.pageStats,
  };
}

function extractStep(raceCount: number, durationMs: number): RaceImportStep {
  return {
    name: 'extract',
    status: raceCount > 0 ? 'success' : 'empty',
    durationMs,
  };
}

export async function processCrawlSiteExtract(input: {
  url: string;
  model: OpenRouterScrapeModelId;
}): Promise<RaceImportResult> {
  const crawl = await timeStep(() => crawlSite(input.url));
  const extract = await timeStep(() =>
    extractFromMarkdown(crawl.result.markdown, input.model),
  );

  return {
    workflow: 'crawlSiteExtract',
    url: input.url,
    races: extract.result.races,
    errorMessage: extract.result.errorMessage,
    markdown: crawl.result.markdown,
    rawModelOutput: extract.result.rawModelOutput,
    usage: extract.result.usage,
    pageStats: crawl.result.pageStats,
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
}): Promise<RaceImportResult> {
  const scrape = await timeStep(() => scrapePage(input.url));
  const extract = await timeStep(() =>
    extractFromMarkdown(scrape.result.markdown, input.model),
  );

  return {
    workflow: 'scrapePageExtract',
    url: input.url,
    races: extract.result.races,
    errorMessage: extract.result.errorMessage,
    markdown: scrape.result.markdown,
    rawModelOutput: extract.result.rawModelOutput,
    usage: extract.result.usage,
    pageStats: scrape.result.pageStats,
    fallbackUsed: null,
    steps: [
      scrapeStep('scrapePage', scrape.result, scrape.durationMs),
      extractStep(extract.result.races.length, extract.durationMs),
    ],
  };
}

export async function processCrawlSite(input: {
  url: string;
}): Promise<RaceImportResult> {
  const crawl = await timeStep(() => crawlSite(input.url));

  return {
    workflow: 'crawlSite',
    url: input.url,
    races: [],
    errorMessage: null,
    markdown: crawl.result.markdown,
    rawModelOutput: null,
    usage: null,
    pageStats: crawl.result.pageStats,
    fallbackUsed: null,
    steps: [scrapeStep('crawlSite', crawl.result, crawl.durationMs)],
  };
}

export async function processScrapePage(input: {
  url: string;
}): Promise<RaceImportResult> {
  const scrape = await timeStep(() => scrapePage(input.url));

  return {
    workflow: 'scrapePage',
    url: input.url,
    races: [],
    errorMessage: null,
    markdown: scrape.result.markdown,
    rawModelOutput: null,
    usage: null,
    pageStats: scrape.result.pageStats,
    fallbackUsed: null,
    steps: [scrapeStep('scrapePage', scrape.result, scrape.durationMs)],
  };
}
