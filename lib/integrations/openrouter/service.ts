import { createOpenRouterClient } from '@/lib/integrations/openrouter/client';
import {
  runMarkdownAgent,
  runImagesAgent,
} from '@/lib/integrations/openrouter/agents';
import type { TrailRaceOpenRouterAgentResult } from '@/lib/integrations/openrouter/agents';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';

function filterFutureRaces(result: TrailRaceOpenRouterAgentResult): TrailRaceOpenRouterAgentResult {
  const todayStr = new Date().toISOString().split('T')[0];
  return { ...result, races: result.races.filter((race) => race.date >= todayStr) };
}

export async function extractFromMarkdown(
  markdown: string,
  model: OpenRouterScrapeModelId,
): Promise<TrailRaceOpenRouterAgentResult> {
  const client = createOpenRouterClient();
  const result = await runMarkdownAgent(client, markdown, model);
  return filterFutureRaces(result);
}

export async function extractFromImages(
  images: string[],
  model: OpenRouterVisionModelId,
): Promise<TrailRaceOpenRouterAgentResult> {
  const client = createOpenRouterClient();
  const result = await runImagesAgent(client, images, model);
  return filterFutureRaces(result);
}
