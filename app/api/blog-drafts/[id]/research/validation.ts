import { parseUuidParam } from '@/app/api/request-validation';
import { ValidationError } from '@/lib/errors';
export function parseInput(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Invalid request body',400);
  const {eventIds} = body as Record<string,unknown>;
  if (!Array.isArray(eventIds) || eventIds.some(id => typeof id !== 'string')) throw new ValidationError('Invalid event IDs',400);
  return eventIds.map(id => parseUuidParam(id,'event id').toLowerCase());
}
