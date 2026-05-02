import { createOpenRouterClient } from '@/lib/integrations/openrouter/client';
import {
  runMarkdownAgent,
  runImagesAgent,
} from '@/lib/integrations/openrouter/agents';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';

function filterFutureRaces(result: OpenRouterServiceResult): OpenRouterServiceResult {
  const todayStr = new Date().toISOString().split('T')[0];
  return { ...result, races: result.races.filter((race) => race.date >= todayStr) };
}

export async function extractFromMarkdown(
  markdown: string,
  model: OpenRouterScrapeModelId,
): Promise<OpenRouterServiceResult> {
  const client = createOpenRouterClient();
  const result = await runMarkdownAgent(client, markdown, model);
  const filtered = filterFutureRaces(result);
  return filtered;
}

export async function extractFromImages(
  images: string[],
  model: OpenRouterVisionModelId,
): Promise<OpenRouterServiceResult> {
  const client = createOpenRouterClient();
  const result = await runImagesAgent(client, images, model);
  const filtered = filterFutureRaces(result);
  return filtered;
}
