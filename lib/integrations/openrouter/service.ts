import { createOpenRouterClient } from '@/lib/integrations/openrouter/client';
import {
  runMarkdownAgent,
  runImagesAgent,
} from '@/lib/integrations/openrouter/agents';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/integrations/openrouter/scrape-models';

const FALLBACK_EMPTY_MESSAGE =
  'No se encontraron carreras adultas de trail válidas en el contenido proporcionado.';

const PAST_RACES_MESSAGE =
  'Las carreras encontradas tienen fechas pasadas y no se pueden importar.';

function filterFutureRaces(
  result: OpenRouterServiceResult,
): OpenRouterServiceResult {
  const todayStr = new Date().toISOString().split('T')[0];
  const races = result.races.filter((race) => race.date >= todayStr);
  let errorMessage: string | null = null;
  if (races.length === 0) {
    errorMessage =
      result.races.length > 0
        ? PAST_RACES_MESSAGE
        : (result.errorMessage ?? FALLBACK_EMPTY_MESSAGE);
  }
  return { ...result, races, errorMessage };
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
