import { ValidationError } from '@/lib/errors';
import { EVENT_RESEARCH_MAX_BATCH_SIZE } from '@/lib/event-research/config';

export function parseResearchBatchInput(body: unknown): { eventNames: string[] } {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { eventNames } = body as Record<string, unknown>;
  if (!Array.isArray(eventNames)) {
    throw new ValidationError('Invalid event names', 400);
  }

  const unique = new Map<string, string>();
  for (const value of eventNames) {
    if (typeof value !== 'string') {
      throw new ValidationError('Invalid event name', 400);
    }
    const name = value.trim();
    if (name.length < 2 || name.length > 200) {
      throw new ValidationError('Invalid event name', 400);
    }
    const key = name.normalize('NFKC').toLocaleLowerCase('es');
    if (!unique.has(key)) unique.set(key, name);
  }

  const names = [...unique.values()];
  if (names.length < 1 || names.length > EVENT_RESEARCH_MAX_BATCH_SIZE) {
    throw new ValidationError('Invalid number of event names', 400);
  }

  return { eventNames: names };
}
