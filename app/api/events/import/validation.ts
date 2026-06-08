import { isOpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { ValidationError } from '@/lib/errors';
import { normalizeUrl } from '@/lib/validation';
import type { EventImportWorkflow } from '@/types/events-import-api.types';
export { ValidationError };

export type ParsedInput =
  | {
      workflow: 'crawlSite' | 'scrapePage';
      url: string;
      skipDuplicateCheck: boolean;
    }
  | {
      workflow: 'crawlSiteExtract' | 'scrapePageExtract';
      url: string;
      model: OpenRouterScrapeModelId;
      skipDuplicateCheck: boolean;
    };

function parseWorkflow(value: unknown): EventImportWorkflow {
  if (
    value === 'crawlSiteExtract' ||
    value === 'scrapePageExtract' ||
    value === 'crawlSite' ||
    value === 'scrapePage'
  ) {
    return value;
  }
  throw new ValidationError('Invalid workflow', 400);
}

export function assertRequestBody(
  body: unknown,
): asserts body is Record<string, unknown> {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }
}

export function parseImportUrl(
  value: unknown,
  requiredMessage: string,
): string {
  const rawUrl = typeof value === 'string' ? value.trim() : '';

  if (!rawUrl) {
    throw new ValidationError(requiredMessage, 400);
  }

  const url = normalizeUrl(rawUrl);

  try {
    new URL(url);
  } catch {
    throw new ValidationError('Invalid URL format', 400);
  }

  return url;
}

export function parseImportModel(value: unknown): OpenRouterScrapeModelId {
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
  assertRequestBody(body);

  const { workflow: rawWorkflow, websiteUrl, model, skipDuplicateCheck } = body;

  const workflow = parseWorkflow(rawWorkflow);
  const url = parseImportUrl(websiteUrl, 'Website URL is required');
  const parsedSkipDuplicateCheck = skipDuplicateCheck === true;

  if (workflow === 'crawlSite' || workflow === 'scrapePage') {
    return { workflow, url, skipDuplicateCheck: parsedSkipDuplicateCheck };
  }

  const parsedModel = parseImportModel(model);

  return {
    workflow,
    url,
    model: parsedModel,
    skipDuplicateCheck: parsedSkipDuplicateCheck,
  };
}
