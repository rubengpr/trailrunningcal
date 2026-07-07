import type { PageStats, ScrapeUsage } from '@/types/races-scrape-api.types';
import { crawlSite as crawlWithContextDev } from '@/lib/integrations/context-dev/service';
import { crawlSite as crawlWithSpider } from '@/lib/integrations/spider-cloud/service';

export interface CrawlResult {
  markdown: string;
  pageStats: PageStats;
  usage: ScrapeUsage;
  fallbackUsed: boolean;
}

export const MIN_CRAWL_MARKDOWN_LENGTH = 1000;

function shouldFallbackFromSpider(result: {
  markdown: string;
  pageStats: PageStats;
}): boolean {
  return (
    result.pageStats.successCount === 0 ||
    result.markdown.trim().length < MIN_CRAWL_MARKDOWN_LENGTH
  );
}

export async function crawlSite(url: string): Promise<CrawlResult> {
  try {
    const spiderResult = await crawlWithSpider(url);
    if (!shouldFallbackFromSpider(spiderResult)) {
      return {
        ...spiderResult,
        fallbackUsed: false,
      };
    }
  } catch (error) {
    console.warn('Spider crawl failed, falling back to Context.dev:', error);
  }

  const contextResult = await crawlWithContextDev(url);
  return {
    ...contextResult,
    fallbackUsed: true,
  };
}
