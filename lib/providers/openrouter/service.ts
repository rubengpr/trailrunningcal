import { createOpenRouterClient } from '@/lib/providers/openrouter/openrouter-client';
import {
  runTrailRaceMarkdownAgentOpenRouter,
  runTrailRaceImagesAgentOpenRouter,
} from '@/lib/agents/trail-race-openrouter';
import type { TrailRaceOpenRouterAgentResult } from '@/lib/agents/trail-race-openrouter';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/providers/openrouter/scrape-models';

function filterFutureRaces(result: TrailRaceOpenRouterAgentResult): TrailRaceOpenRouterAgentResult {
  const todayStr = new Date().toISOString().split('T')[0];
  return { ...result, races: result.races.filter((race) => race.date >= todayStr) };
}

export async function extractFromMarkdown(
  markdown: string,
  model: OpenRouterScrapeModelId,
): Promise<TrailRaceOpenRouterAgentResult> {
  const client = createOpenRouterClient();
  const result = await runTrailRaceMarkdownAgentOpenRouter(client, markdown, model);
  return filterFutureRaces(result);
}

export async function extractFromImages(
  images: string[],
  model: OpenRouterVisionModelId,
): Promise<TrailRaceOpenRouterAgentResult> {
  const client = createOpenRouterClient();
  const result = await runTrailRaceImagesAgentOpenRouter(client, images, model);
  return filterFutureRaces(result);
}
