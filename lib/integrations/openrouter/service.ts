import { MarkdownTooLongError, MarkdownTooShortError } from '@/lib/errors';
import { createOpenRouterClient } from '@/lib/integrations/openrouter/client';
import {
  runMarkdownAgent,
  runImagesAgent,
} from '@/lib/integrations/openrouter/agents';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import { checkDescriptionLang } from '@/lib/integrations/openrouter/description-language';
import { checkDescriptionFormat } from '@/lib/integrations/openrouter/description-format';
import { filterFutureRaces } from '@/lib/integrations/openrouter/filter-future-races';
import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/integrations/openrouter/scrape-models';

const MIN_MARKDOWN_LENGTH = 1000;
const MAX_MARKDOWN_LENGTH = 100_000;

function validateMarkdownLength(markdown: string): void {
  if (markdown.length < MIN_MARKDOWN_LENGTH) {
    throw new MarkdownTooShortError(markdown);
  }
  if (markdown.length > MAX_MARKDOWN_LENGTH) {
    throw new MarkdownTooLongError(markdown);
  }
}

export async function extractFromMarkdown(
  markdown: string,
  model: OpenRouterScrapeModelId,
): Promise<OpenRouterServiceResult> {
  validateMarkdownLength(markdown);
  const client = createOpenRouterClient();
  const result = await runMarkdownAgent(client, markdown, model);
  const languageChecked = await checkDescriptionLang(client, result);
  const formatChecked = await checkDescriptionFormat(client, languageChecked);
  return filterFutureRaces(formatChecked);
}

export async function extractFromImages(
  images: string[],
  model: OpenRouterVisionModelId,
): Promise<OpenRouterServiceResult> {
  const client = createOpenRouterClient();
  const result = await runImagesAgent(client, images, model);
  const languageChecked = await checkDescriptionLang(client, result);
  const formatChecked = await checkDescriptionFormat(client, languageChecked);
  return filterFutureRaces(formatChecked);
}
