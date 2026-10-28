import { ValidationError } from '@/lib/errors';
import type { PublicationInput } from '@/types/blog-publication.types';

export function parseDetails(body: unknown): PublicationInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Invalid request body', 400);
  const data = body as Record<string, unknown>;
  if (Object.keys(data).some(key => !['author', 'date', 'imageAlt', 'version'].includes(key)) || typeof data.author !== 'string' || typeof data.date !== 'string' || ('imageAlt' in data && typeof data.imageAlt !== 'string') || !Number.isSafeInteger(data.version) || Number(data.version) < 0) throw new ValidationError('Invalid request body', 400);
  return { author: data.author, date: data.date, ...('imageAlt' in data ? { imageAlt: data.imageAlt as string } : {}), version: Number(data.version) };
}
