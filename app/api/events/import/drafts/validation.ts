import { ValidationError } from '@/lib/errors';

export function parseDraftCreateInput(body: unknown): {
  sourceUrl: string | null;
  batchItemId: string | null;
} {
  if (typeof body !== 'object' || body === null) throw new ValidationError('Invalid request body', 400);
  const { sourceUrl, batchItemId } = body as Record<string, unknown>;
  if (sourceUrl !== undefined && sourceUrl !== null && typeof sourceUrl !== 'string') throw new ValidationError('Invalid source URL', 400);
  if (typeof sourceUrl === 'string') {
    try { new URL(sourceUrl); } catch { throw new ValidationError('Invalid source URL', 400); }
  }
  if (batchItemId !== undefined && batchItemId !== null && (typeof batchItemId !== 'string' || !/^[0-9a-f-]{36}$/i.test(batchItemId))) {
    throw new ValidationError('Invalid batch item ID', 400);
  }
  return { sourceUrl: sourceUrl ?? null, batchItemId: batchItemId ?? null };
}
