import { parseUuidParam } from '@/app/api/request-validation';
import { ValidationError } from '@/lib/errors';
import type { DraftInput } from '@/types/blog-draft-record.types';

export function parseInput(body: unknown): DraftInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Invalid request body', 400);
  }
  const record = body as Record<string, unknown>;
  if ('regionId' in record || 'eventIds' in record) {
    if ('instructions' in record || typeof record.regionId !== 'string' || !Array.isArray(record.eventIds) || record.eventIds.some(id => typeof id !== 'string')) {
      throw new ValidationError('Invalid selection', 400);
    }
    return {regionId: record.regionId, eventIds: record.eventIds.map(id => parseUuidParam(id as string, 'event id').toLowerCase())};
  }
  const { instructions } = record;
  if (typeof instructions !== 'string') {
    throw new ValidationError('Invalid instructions', 400);
  }
  return { instructions };
}

export function parsePage(value: string | null): number {
  if (value === null) return 1;
  if (!/^[1-9]\d*$/.test(value)) throw new ValidationError('Invalid page', 400);
  const page = Number(value);
  // Keep the range offset representable as a safe integer.
  if (!Number.isSafeInteger(page) || page > Math.floor(Number.MAX_SAFE_INTEGER / 50)) {
    throw new ValidationError('Invalid page', 400);
  }
  return page;
}
