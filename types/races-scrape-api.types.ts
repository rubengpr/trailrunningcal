export interface PageStats {
  total: number;
  successCount: number;
  errorCount: number;
}

export interface ScrapeUsage {
  totalCost: number | null;
}

export const SCRAPE_PIPELINE_MODES = [
  'crawlSite',
  'scrapePage',
  'markdown',
  'images',
] as const;

export type ScrapePipelineMode = (typeof SCRAPE_PIPELINE_MODES)[number];

export function isScrapePipelineMode(value: unknown): value is ScrapePipelineMode {
  return (
    typeof value === 'string' &&
    (SCRAPE_PIPELINE_MODES as readonly string[]).includes(value)
  );
}
