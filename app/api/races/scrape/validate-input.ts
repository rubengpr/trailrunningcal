import { ValidationError } from '@/lib/errors';
export { ValidationError };

export type ParsedInput =
  | { mode: 'crawlSite'; url: string }
  | { mode: 'scrapePage'; url: string };

export function parseInput(body: unknown): ParsedInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { websiteUrl, mode } = body as Record<string, unknown>;

  const url = typeof websiteUrl === 'string' ? websiteUrl.trim() : '';
  if (!url) throw new ValidationError('Website URL is required', 400);

  if (mode === 'crawlSite') return { mode, url };
  if (mode === 'scrapePage') return { mode, url };

  throw new ValidationError('Invalid mode', 400);
}
