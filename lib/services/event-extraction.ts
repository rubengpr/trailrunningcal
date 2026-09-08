import {
  extractFromImages,
  extractFromMarkdown,
} from '@/lib/integrations/openrouter/service';
import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/integrations/openrouter/scrape-models';
import type { PageStats } from '@/types/races-scrape-api.types';

const EMPTY_PAGE_STATS: PageStats = {
  total: 0,
  successCount: 0,
  errorCount: 0,
};

export type EventExtractionInput =
  | { mode: 'markdown'; markdown: string; model: OpenRouterScrapeModelId }
  | { mode: 'images'; images: string[]; model: OpenRouterVisionModelId };

export async function extractEvent(input: EventExtractionInput) {
  const result = input.mode === 'images'
    ? await extractFromImages(input.images, input.model)
    : await extractFromMarkdown(input.markdown, input.model);

  return {
    event: result.event,
    races: result.races,
    errorMessage: result.errorMessage,
    rawModelOutput: result.rawModelOutput,
    usage: result.usage,
    pageStats: EMPTY_PAGE_STATS,
  };
}
