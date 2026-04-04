/** Per-page HTTP outcome after Spider crawl; success + error === total always. */
export interface CrawlPageStats {
  total: number;
  successCount: number;
  errorCount: number;
}

export const SCRAPE_PIPELINE_MODES = [
  'crawlOnly',
  'scrapeOnly',
  'llmFromMarkdown',
  'crawlAndLlm',
  'llmFromImages',
] as const;

export type ScrapePipelineMode = (typeof SCRAPE_PIPELINE_MODES)[number];

export function isScrapePipelineMode(value: unknown): value is ScrapePipelineMode {
  return (
    typeof value === 'string' &&
    (SCRAPE_PIPELINE_MODES as readonly string[]).includes(value)
  );
}
