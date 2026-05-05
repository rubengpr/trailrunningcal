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

export async function processAutopilot(input: {
  url: string;
  model: OpenRouterScrapeModelId;
}): Promise<RaceImportResult> {
  const singlePageScrape = await timeStep(() => scrapePage(input.url));
  const singlePageExtract = await timeStep(() =>
    extractFromMarkdown(singlePageScrape.result.markdown, input.model),
  );

  const initialSteps = [
    scrapeStep(
      'scrapePage',
      singlePageScrape.result,
      singlePageScrape.durationMs,
    ),
    extractStep(
      singlePageExtract.result.races.length,
      singlePageExtract.durationMs,
    ),
  ];

  if (singlePageExtract.result.races.length > 0) {
    return {
      workflow: 'autopilot',
      url: input.url,
      races: singlePageExtract.result.races,
      markdown: singlePageScrape.result.markdown,
      rawModelOutput: singlePageExtract.result.rawModelOutput,
      usage: singlePageExtract.result.usage,
      pageStats: singlePageScrape.result.pageStats,
      fallbackUsed: false,
      steps: initialSteps,
    };
  }

  const crawl = await timeStep(() => crawlSite(input.url));
  const crawlExtract = await timeStep(() =>
    extractFromMarkdown(crawl.result.markdown, input.model),
  );

  return {
    workflow: 'autopilot',
    url: input.url,
    races: crawlExtract.result.races,
    markdown: crawl.result.markdown,
    rawModelOutput: crawlExtract.result.rawModelOutput,
    usage: crawlExtract.result.usage,
    pageStats: crawl.result.pageStats,
    fallbackUsed: true,
    steps: [
      ...initialSteps,
      scrapeStep('crawlSite', crawl.result, crawl.durationMs),
      extractStep(crawlExtract.result.races.length, crawlExtract.durationMs),
    ],
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
    markdown: scrape.result.markdown,
    rawModelOutput: null,
    usage: null,
    pageStats: scrape.result.pageStats,
    fallbackUsed: null,
    steps: [scrapeStep('scrapePage', scrape.result, scrape.durationMs)],
  };
}
