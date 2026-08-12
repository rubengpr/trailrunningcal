import { ValidationError } from '@/lib/errors';
import { MAX_TRACK_FILE_SIZE_BYTES } from '@/lib/race-tracks/parse';
import type { TrackImportMode } from '@/types/race-track.types';

const MAX_EVENT_SLUG_LENGTH = 200;
const MAX_RACE_NAME_LENGTH = 300;
const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;
export const MAX_TRACK_REQUEST_SIZE_BYTES =
  MAX_TRACK_FILE_SIZE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES;

export interface RaceTrackRequestInput {
  eventSlug: string;
  raceName: string;
  file: File;
  mode: TrackImportMode;
}

export function validateRaceTrackRequestSize(headers: Headers): void {
  const contentLength = headers.get('content-length');
  if (contentLength === null) return;

  const size = Number(contentLength);
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new ValidationError('Invalid input', 400);
  }

  if (size > MAX_TRACK_REQUEST_SIZE_BYTES) {
    throw new ValidationError('Invalid track file', 413);
  }
}

function requiredString(
  value: FormDataEntryValue | null,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new ValidationError('Invalid input', 400);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ValidationError('Invalid input', 400);
  }

  return normalized;
}

export function validateRaceTrackRequest(
  formData: FormData,
): RaceTrackRequestInput {
  const eventSlug = requiredString(
    formData.get('eventSlug'),
    MAX_EVENT_SLUG_LENGTH,
  );
  const raceName = requiredString(
    formData.get('raceName'),
    MAX_RACE_NAME_LENGTH,
  );
  const modeValue = formData.get('mode');
  const file = formData.get('file');

  if (modeValue !== 'dry-run' && modeValue !== 'apply') {
    throw new ValidationError('Invalid input', 400);
  }

  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.gpx')) {
    throw new ValidationError('Invalid input', 400);
  }

  if (file.size === 0) {
    throw new ValidationError('Invalid input', 400);
  }

  if (file.size > MAX_TRACK_FILE_SIZE_BYTES) {
    throw new ValidationError('Invalid track file', 413);
  }

  return { eventSlug, raceName, mode: modeValue, file };
}
