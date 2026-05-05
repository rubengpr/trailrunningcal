import { isOpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { ValidationError } from '@/lib/errors';
import { normalizeUrl } from '@/lib/validation';
import type { RaceImportWorkflow } from '@/types/races-import-api.types';
export { ValidationError };

export type ParsedInput =
  | { workflow: 'crawlMdOnly'; url: string }
  | {
      workflow: 'autopilot' | 'crawlSiteExtract';
      url: string;
      model: OpenRouterScrapeModelId;
    };

function parseWorkflow(value: unknown): RaceImportWorkflow {
  if (
    value === 'autopilot' ||
    value === 'crawlSiteExtract' ||
    value === 'crawlMdOnly'
  ) {
    return value;
  }
  throw new ValidationError('Invalid workflow', 400);
}

function parseUrl(value: unknown): string {
  const rawUrl = typeof value === 'string' ? value.trim() : '';
  if (!rawUrl) {
    throw new ValidationError('Website URL is required', 400);
  }

  const url = normalizeUrl(rawUrl);
  try {
    new URL(url);
  } catch {
    throw new ValidationError('Invalid URL format', 400);
  }

  return url;
}

function parseModel(value: unknown): OpenRouterScrapeModelId {
  const isModelMissing = typeof value !== 'string' || value === '';
  if (isModelMissing || !isOpenRouterScrapeModelId(value)) {
    throw new ValidationError(
      isModelMissing ? 'Model is required' : 'Invalid model',
      400,
    );
  }
  return value;
}

export function parseInput(body: unknown): ParsedInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const {
    workflow: rawWorkflow,
    websiteUrl,
    model,
  } = body as Record<string, unknown>;

  const workflow = parseWorkflow(rawWorkflow);
  const url = parseUrl(websiteUrl);

  if (workflow === 'crawlMdOnly') {
    return { workflow, url };
  }

  const parsedModel = parseModel(model);

  return { workflow, url, model: parsedModel };
}
