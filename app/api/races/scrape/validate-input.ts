import { isOpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { ValidationError } from '@/lib/errors';
export { ValidationError };

export type ParsedInput =
  | { mode: 'crawlSite'; url: string }
  | { mode: 'scrapePage'; url: string }
  | { mode: 'crawlSiteExtract'; url: string; model: OpenRouterScrapeModelId };

export function parseInput(body: unknown): ParsedInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { websiteUrl, model, mode } = body as Record<string, unknown>;

  const url = typeof websiteUrl === 'string' ? websiteUrl.trim() : '';
  if (!url) throw new ValidationError('Website URL is required', 400);

  if (mode === 'crawlSite') return { mode, url };
  if (mode === 'scrapePage') return { mode, url };

  if (mode !== undefined && mode !== null && mode !== '' && mode !== 'crawlSiteExtract') {
    throw new ValidationError('Invalid mode', 400);
  }

  // crawlSiteExtract (default when no mode given)
  const isModelMissing = typeof model !== 'string' || model === '';
  if (isModelMissing || !isOpenRouterScrapeModelId(model)) {
    throw new ValidationError(isModelMissing ? 'Model is required' : 'Invalid model', 400);
  }
  return { mode: 'crawlSiteExtract', url, model };
}
