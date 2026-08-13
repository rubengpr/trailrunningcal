import { ValidationError } from '@/lib/errors';
import { MAX_TRACK_UPLOAD_SIZE_BYTES } from '@/lib/race-tracks/limits';
import type { TrackImportMode } from '@/types/race-track.types';

const MAX_EVENT_SLUG_LENGTH = 200;
const MAX_RACE_NAME_LENGTH = 300;
const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;
export const MAX_TRACK_REQUEST_SIZE_BYTES =
  MAX_TRACK_UPLOAD_SIZE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES;

export interface RaceTrackRequestInput {
  eventSlug: string;
  raceName: string;
  file: File;
  mode: TrackImportMode;
}

export interface AdminRaceTrackRequestInput {
  file: File;
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
  const file = validateTrackFile(formData.get('file'));

  if (modeValue !== 'dry-run' && modeValue !== 'apply') {
    throw new ValidationError('Invalid input', 400);
  }

  return { eventSlug, raceName, mode: modeValue, file };
}

function validateTrackFile(value: FormDataEntryValue | null): File {
  const name = value instanceof File ? value.name.toLowerCase() : '';
  if (
    !(value instanceof File) ||
    (!name.endsWith('.gpx') && !name.endsWith('.gpx.gz'))
  ) {
    throw new ValidationError('Invalid input', 400);
  }

  if (value.size === 0) {
    throw new ValidationError('Invalid input', 400);
  }

  if (value.size > MAX_TRACK_UPLOAD_SIZE_BYTES) {
    throw new ValidationError('Invalid track file', 413);
  }

  return value;
}

export function validateAdminRaceTrackRequest(
  formData: FormData,
): AdminRaceTrackRequestInput {
  const entries = Array.from(formData.entries());
  if (entries.length !== 1 || entries[0]?.[0] !== 'file') {
    throw new ValidationError('Invalid input', 400);
  }

  return { file: validateTrackFile(formData.get('file')) };
}
