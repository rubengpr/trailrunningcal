import {
  findRaceTrackTargets,
  updateRaceTrackGeometry,
} from '@/lib/db/race-tracks';
import { ValidationError } from '@/lib/errors';
import { parseTrackFile } from '@/lib/race-tracks/parse';
import { requireLocalTrackImportProject } from '@/lib/race-tracks/project';
import type {
  RaceTrackImportInput,
  RaceTrackImportResult,
} from '@/types/race-track.types';

export async function importRaceTrack(
  input: RaceTrackImportInput,
): Promise<RaceTrackImportResult> {
  if (input.mode === 'dry-run') {
    requireLocalTrackImportProject(process.env.NEXT_PUBLIC_SUPABASE_URL);
  }

  const parsed = parseTrackFile(input.bytes);
  const matches = await findRaceTrackTargets(input.eventSlug, input.raceName);

  if (matches.length === 0) {
    throw new ValidationError('Race not found', 404);
  }

  if (matches.length > 1) {
    throw new ValidationError('Multiple races match', 409);
  }

  const race = matches[0]!;
  if (input.mode === 'apply') {
    await updateRaceTrackGeometry(race.id, parsed.geometry);
  }

  return {
    mode: input.mode,
    raceId: race.id,
    eventSlug: input.eventSlug,
    geometryType: parsed.geometryType,
    segmentCount: parsed.segmentCount,
    pointCount: parsed.pointCount,
    normalizedSizeBytes: parsed.normalizedSizeBytes,
  };
}
