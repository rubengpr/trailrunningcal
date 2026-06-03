import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { DEFAULT_EVENT_DESCRIPTION_MODEL } from '@/lib/services/event-description';
import {
  assertRequestBody,
  parseImportModel,
  ValidationError,
} from '@/app/api/races/import/validation';

export { ValidationError };

export interface ParsedEventDescriptionBatchInput {
  eventIds: string[];
  model: OpenRouterScrapeModelId;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuidParam(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`Invalid ${label}`, 400);
  }

  return value;
}

function parseEventIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError('At least one event is required', 400);
  }

  const ids = value.map((eventId) => {
    if (typeof eventId !== 'string' || eventId.trim().length === 0) {
      throw new ValidationError('Invalid event id', 400);
    }

    return parseUuidParam(eventId.trim(), 'event id');
  });

  if (ids.length === 0) {
    throw new ValidationError('At least one event is required', 400);
  }

  return Array.from(new Set(ids));
}

export function parseBatchInput(
  body: unknown,
): ParsedEventDescriptionBatchInput {
  assertRequestBody(body);

  return {
    eventIds: parseEventIds(body.eventIds),
    model:
      typeof body.model === 'string' && body.model.length > 0
        ? parseImportModel(body.model)
        : DEFAULT_EVENT_DESCRIPTION_MODEL,
  };
}
