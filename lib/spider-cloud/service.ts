import { normalizeUrl } from '@/lib/validation';
import { scrape, crawl, summarizeCrawlStats } from '@/lib/spider-cloud/client';
import type { CrawlPageStats } from '@/lib/spider-cloud/client';
import { mergePages } from '@/lib/spider-cloud/join-markdown';

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
  const pages = await scrape(normalizedUrl);
  const crawlPageStats = summarizeCrawlStats(pages);
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
  const pages = await crawl(normalizedUrl);
  const crawlPageStats = summarizeCrawlStats(pages);
  const markdown = mergePages(normalizedUrl, pages);
  return { markdown, crawlPageStats };
}
