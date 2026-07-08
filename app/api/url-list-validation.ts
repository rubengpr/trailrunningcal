import { ValidationError } from '@/lib/errors';
import { normalizeUrl } from '@/lib/validation';

export interface SkippedUrl {
  url: string;
  reason: string;
}

const MAX_URLS = 100;

export function validateUrlsPayload(urls: unknown): asserts urls is string[] {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    throw new ValidationError('URLs are required', 400);
  }
  if (urls.length > MAX_URLS) {
    throw new ValidationError(`Too many URLs (max ${MAX_URLS})`, 400);
  }
}

type ValidatedUrls = {
  validUrls: string[];
  invalidSkips: SkippedUrl[];
};

export function validateAndNormalizeUrls(urls: string[]): ValidatedUrls {
  const validUrls: string[] = [];
  const invalidSkips: SkippedUrl[] = [];

  for (const raw of urls) {
    if (typeof raw !== 'string' || raw.trim().length === 0) continue;
    const normalized = normalizeUrl(raw.trim());
    try {
      new URL(normalized);
      validUrls.push(normalized);
    } catch {
      invalidSkips.push({ url: raw.trim(), reason: 'invalidUrl' });
    }
  }

  return { validUrls, invalidSkips };
}
