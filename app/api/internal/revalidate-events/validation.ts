import { ValidationError } from '@/lib/errors';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUGS = 100;

export function parseRevalidateEventSlugs(body: unknown): string[] {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid input', 400);
  }

  const slugs = (body as { slugs?: unknown }).slugs;
  if (!Array.isArray(slugs) || slugs.length === 0 || slugs.length > MAX_SLUGS) {
    throw new ValidationError('Invalid input', 400);
  }

  const parsed = slugs.map((slug) => {
    if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
      throw new ValidationError('Invalid input', 400);
    }
    return slug;
  });

  return Array.from(new Set(parsed));
}
