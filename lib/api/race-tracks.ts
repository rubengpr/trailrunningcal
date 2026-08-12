import type { RaceTrackSaveResult } from '@/types/race-track.types';

export async function uploadRaceTrack(
  raceId: string,
  file: File,
): Promise<RaceTrackSaveResult> {
  const formData = new FormData();
  formData.set('file', file);

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
