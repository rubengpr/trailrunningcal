import { normalizeUrl } from '@/lib/validation';
import { spiderCloudScrape, spiderCloudCrawl, summarizeSpiderCrawlHttpStatus } from '@/lib/spider-cloud/client';
import { mergePages } from '@/lib/spider-cloud/join-markdown';
import type { CrawlPageStats } from '@/types/races-scrape-api.types';

export interface SpiderServiceResult {
  markdown: string;
  crawlPageStats: CrawlPageStats;
}

export async function scrapePage(urlStr: string): Promise<SpiderServiceResult> {
  const normalizedUrl = normalizeUrl(urlStr);
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('INVALID_URL');
  }
  const pages = await spiderCloudScrape(normalizedUrl);
  const crawlPageStats = summarizeSpiderCrawlHttpStatus(pages);
  const markdown = mergePages(normalizedUrl, pages);
  return { markdown, crawlPageStats };
}

export async function crawlSite(urlStr: string): Promise<SpiderServiceResult> {
  const normalizedUrl = normalizeUrl(urlStr);
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('INVALID_URL');
  }
  const pages = await spiderCloudCrawl(normalizedUrl);
  const crawlPageStats = summarizeSpiderCrawlHttpStatus(pages);
  const markdown = mergePages(normalizedUrl, pages);
  return { markdown, crawlPageStats };
}
