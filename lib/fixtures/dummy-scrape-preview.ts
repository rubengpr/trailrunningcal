import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { CrawlPageStats } from '@/lib/spider-cloud/client';

import { DUMMY_SCRAPED_RACES } from '@/lib/fixtures/dummy-scraped-races';

/**
 * Sample markdown, usage, and raw JSON for admin scrape UI preview without calling the API.
 */
export const DUMMY_SCRAPE_MARKDOWN =
    '# Event dummy — vista previa\n\n' +
    'Aquest contingut és fictici per provar el layout, les mides i els botons de descàrrega.\n\n' +
    '## Secció de prova\n\n' +
    '- Línia 1\n' +
    '- Línia 2\n';

export const DUMMY_SCRAPE_USAGE: OpenRouterScrapeUsage = {
    promptTokens: 12_400,
    completionTokens: 890,
    totalTokens: 13_290,
    reasoningTokens: 0,
};

export const DUMMY_RAW_MODEL_OUTPUT = JSON.stringify({ races: DUMMY_SCRAPED_RACES }, null, 2);

/** Milliseconds shown as “last run” duration after loading dummy data. */
export const DUMMY_LAST_RUN_DURATION_MS = 1_420;

/** Crawl HTTP stats for mock preview (success + error === total). */
export const DUMMY_CRAWL_PAGE_STATS: CrawlPageStats = {
  total: 7,
  successCount: 6,
  errorCount: 1,
};
