import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { EVENT_IMPORT_MAX_BATCH_SIZE } from '@/lib/event-import/config';
import { assertRequestBody } from '@/app/api/request-validation';
import {
  parseImportModel,
  parseImportUrl,
  ValidationError,
} from '../validation';

export { ValidationError };

export interface ParsedBatchInput {
  urls: string[];
  model: OpenRouterScrapeModelId;
}

function parseUrls(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError('At least one URL is required', 400);
  }
  if (value.length > EVENT_IMPORT_MAX_BATCH_SIZE) {
    throw new ValidationError(
      `Too many URLs (max ${EVENT_IMPORT_MAX_BATCH_SIZE})`,
      400,
    );
  }

  const urls = value.map((url) => parseImportUrl(url, 'URL is required'));
  return Array.from(new Set(urls));
}

export function parseBatchInput(body: unknown): ParsedBatchInput {
  assertRequestBody(body);

  const { urls, model } = body;

  return {
    urls: parseUrls(urls),
    model: parseImportModel(model),
  };
}
