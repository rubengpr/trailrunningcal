import { filterExcludedResultPages } from '@/lib/crawl/filters';
import { mergePages } from '@/lib/crawl/merge-markdown';
import type { CrawlPage } from '@/lib/crawl/merge-markdown';
import { crawl } from '@/lib/integrations/context-dev/client';
import type {
  ContextCrawlResponse,
  ContextCrawlResult,
} from '@/lib/integrations/context-dev/client';
import type { PageStats, ScrapeUsage } from '@/types/races-scrape-api.types';

export interface ContextServiceResult {
  markdown: string;
  pageStats: PageStats;
  usage: ScrapeUsage;
}

const COST_PER_SUCCEEDED_PAGE_USD = 0.025;

function pickUrl(seedUrl: string, result: ContextCrawlResult): string {
  const candidates = [result.url, result.metadata?.url, result.metadata?.sourceURL];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return seedUrl;
}

function pickStatus(result: ContextCrawlResult): number {
  const rawStatus = result.metadata?.statusCode ?? result.metadata?.status;
  if (typeof rawStatus === 'number' && Number.isFinite(rawStatus)) {
    return rawStatus;
  }
  if (result.metadata?.success === true) return 200;
  if (result.metadata?.success === false) return 0;
  return result.markdown.length > 0 ? 200 : 0;
}

function pickError(result: ContextCrawlResult): string | null {
  const error = result.metadata?.error;
  return typeof error === 'string' && error.length > 0 ? error : null;
}

function pickGeneratedAt(result: ContextCrawlResult): string | undefined {
  const generatedAt = result.metadata?.generatedAt ?? result.metadata?.scrapedAt;
  return typeof generatedAt === 'string' && generatedAt.length > 0
    ? generatedAt
    : undefined;
}

function normalizePages(
  seedUrl: string,
  response: ContextCrawlResponse,
): CrawlPage[] {
  return response.results.map((result) => {
    const page: CrawlPage = {
      url: pickUrl(seedUrl, result),
      content: result.markdown,
      status: pickStatus(result),
      error: pickError(result),
    };
    const generatedAt = pickGeneratedAt(result);
    if (generatedAt !== undefined) {
      page.generatedAt = generatedAt;
    }
    return page;
  });
}

function summarizeStats(pages: CrawlPage[]): PageStats {
  const total = pages.length;
  let successCount = 0;
  for (const page of pages) {
    if (page.status >= 200 && page.status < 300) {
      successCount += 1;
    }
  }
  const errorCount = total - successCount;
  return { total, successCount, errorCount };
}

function summarizeUsage(response: ContextCrawlResponse): ScrapeUsage {
  const numSucceeded = response.metadata.numSucceeded;
  return {
    totalCost:
      typeof numSucceeded === 'number' && Number.isFinite(numSucceeded)
        ? numSucceeded * COST_PER_SUCCEEDED_PAGE_USD
        : null,
  };
}

export async function crawlSite(url: string): Promise<ContextServiceResult> {
  const response = await crawl(url, {
    maxPages: 15,
    maxDepth: 2,
    includeLinks: true,
    includeImages: false,
    useMainContentOnly: false,
    timeoutMS: 30_000,
    stopAfterMs: 30_000,
  });
  const pages = normalizePages(url, response);
  const filteredPages = filterExcludedResultPages(pages);
  const pageStats = summarizeStats(filteredPages);
  const usage = summarizeUsage(response);
  const markdown = mergePages(url, filteredPages);
  return { markdown, pageStats, usage };
}
