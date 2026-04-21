import { normalizeUrl } from '@/lib/validation';
import {
    spiderCloudScrape,
    spiderCloudCrawl,
    summarizeSpiderCrawlHttpStatus,
} from '@/lib/agents/spider-crawl';
import { joinSpiderCrawlPagesToMarkdown } from '@/lib/agents/spider-crawl-join-markdown';
import type { CrawlPageStats } from '@/types/races-scrape-api.types';

export interface SpiderPipelineResult {
    markdown: string;
    crawlPageStats: CrawlPageStats;
}

export async function scrapeUrlToMarkdown(urlStr: string): Promise<SpiderPipelineResult> {
    const normalizedUrl = normalizeUrl(urlStr);
    try {
        new URL(normalizedUrl);
    } catch {
        throw new Error('INVALID_URL');
    }
    const pages = await spiderCloudScrape(normalizedUrl);
    const crawlPageStats = summarizeSpiderCrawlHttpStatus(pages);
    const markdown = joinSpiderCrawlPagesToMarkdown(normalizedUrl, pages);
    return { markdown, crawlPageStats };
}

export async function crawlUrlToMarkdown(urlStr: string): Promise<SpiderPipelineResult> {
    const normalizedUrl = normalizeUrl(urlStr);
    try {
        new URL(normalizedUrl);
    } catch {
        throw new Error('INVALID_URL');
    }
    const pages = await spiderCloudCrawl(normalizedUrl);
    const crawlPageStats = summarizeSpiderCrawlHttpStatus(pages);
    const markdown = joinSpiderCrawlPagesToMarkdown(normalizedUrl, pages);
    return { markdown, crawlPageStats };
}
