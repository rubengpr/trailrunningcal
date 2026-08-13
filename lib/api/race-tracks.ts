import {
  MAX_TRACK_UPLOAD_SIZE_BYTES,
} from '@/lib/race-tracks/limits';
import { normalizeTrackForTransport } from '@/lib/race-tracks/transport';
import type { RaceTrackSaveResult } from '@/types/race-track.types';

export class TrackTransportSizeError extends Error {}

async function gzipFile(file: File): Promise<File> {
  const compressedStream = file
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const compressed = await new Response(compressedStream).blob();
  return new File([compressed], `${file.name}.gz`, {
    type: 'application/gzip',
  });
}

async function compressTrackFile(file: File): Promise<File> {
  const compressed = await gzipFile(file);
  if (compressed.size <= MAX_TRACK_UPLOAD_SIZE_BYTES) return compressed;

  const normalized = normalizeTrackForTransport(await file.text());
  const normalizedFile = new File([normalized], file.name, {
    type: 'application/gpx+xml',
  });
  const normalizedCompressed = await gzipFile(normalizedFile);
  if (normalizedCompressed.size > MAX_TRACK_UPLOAD_SIZE_BYTES) {
    throw new TrackTransportSizeError();
  }
  return normalizedCompressed;
}

export async function uploadRaceTrack(
  raceId: string,
  file: File,
): Promise<RaceTrackSaveResult> {
  const formData = new FormData();
  formData.set('file', await compressTrackFile(file));

  const response = await fetch(`/api/race-tracks/${encodeURIComponent(raceId)}`, {
    method: 'POST',
    body: formData,
  });
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error('Failed to upload race track');
  }

  return responseData.data;
}
