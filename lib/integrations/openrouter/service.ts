import { MarkdownTooLongError, MarkdownTooShortError } from '@/lib/errors';
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

const MIN_MARKDOWN_LENGTH = 1000;
const MAX_MARKDOWN_LENGTH = 300_000;

const FALLBACK_EMPTY_MESSAGE =
  'No se encontró un evento de trail válido en el contenido proporcionado.';

const PAST_RACES_MESSAGE =
  'Las carreras encontradas tienen fechas pasadas y no se pueden importar.';

function validateMarkdownLength(markdown: string): void {
  if (markdown.length < MIN_MARKDOWN_LENGTH) {
    throw new MarkdownTooShortError(markdown);
  }
  if (markdown.length > MAX_MARKDOWN_LENGTH) {
    throw new MarkdownTooLongError(markdown);
  }
}

function filterFutureRaces(
  result: OpenRouterServiceResult,
): OpenRouterServiceResult {
  const todayStr = new Date().toISOString().split('T')[0];
  const races = result.races.filter(
    (race) => race.date === null || race.date >= todayStr,
  );
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
  validateMarkdownLength(markdown);
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
