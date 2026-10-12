import { ValidationError } from '@/lib/errors';
import type { DraftInput } from '@/types/blog-draft-record.types';

export function parseInput(body: unknown): DraftInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Invalid request body', 400);
  }
  const { instructions } = body as Record<string, unknown>;
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
