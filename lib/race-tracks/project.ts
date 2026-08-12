import { ValidationError } from '@/lib/errors';

export const LOCAL_TRACK_IMPORT_PROJECT = 'trailrunningcal-local';
export const LOCAL_TRACK_IMPORT_PROJECT_REF = 'wghqldoshvwulyqqbqln';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function normalizeTrackImportBaseUrl(value: string): string {
  const url = new URL(value);
  const isLoopback = LOOPBACK_HOSTNAMES.has(url.hostname);

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new Error('Track imports require HTTPS except on localhost');
  }

  return url.origin;
}

export function isLocalTrackImportProject(url: string | undefined): boolean {
  if (!url) return false;

  try {
    return new URL(url).hostname === `${LOCAL_TRACK_IMPORT_PROJECT_REF}.supabase.co`;
  } catch {
    return false;
  }
}

export function requireLocalTrackImportProject(
  url: string | undefined,
): void {
  if (!isLocalTrackImportProject(url)) {
    throw new ValidationError(
      `Dry-run must target ${LOCAL_TRACK_IMPORT_PROJECT}`,
      400,
    );
  }
}
