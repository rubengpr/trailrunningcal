import { normalizeUrl } from '@/lib/validation';
import { scrape, crawl } from '@/lib/spider-cloud/client';
import type { CrawlPage } from '@/lib/spider-cloud/client';

/** Per-page HTTP outcome after Spider crawl; success + error === total always. */
export interface CrawlPageStats {
  total: number;
  successCount: number;
  errorCount: number;
}

export function summarizeCrawlStats(pages: CrawlPage[]): CrawlPageStats {
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
