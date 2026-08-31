import {
  findRaceTrackTargetById,
  findRaceTrackTargets,
  updateRaceTrackGeometry,
} from '@/lib/db/race-tracks';
import { ValidationError } from '@/lib/errors';
import { parseTrackFile, type ParsedTrack } from '@/lib/race-tracks/parse';
import { requireLocalTrackImportProject } from '@/lib/race-tracks/project';
import type {
  RaceTrackImportInput,
  RaceTrackImportResult,
  RaceTrackSaveInput,
  RaceTrackSaveResult,
  TrackProcessingSummary,
} from '@/types/race-track.types';

function getProcessingSummary(parsed: ParsedTrack): TrackProcessingSummary {
  return {
    geometryType: parsed.geometryType,
    pointCount: parsed.pointCount,
    preSimplificationSizeBytes: parsed.preSimplificationSizeBytes,
    removedPointCount: parsed.removedPointCount,
    segmentCount: parsed.segmentCount,
    simplified: parsed.simplified,
    sourcePointCount: parsed.sourcePointCount,
    sourceSizeBytes: parsed.sourceSizeBytes,
    normalizedSizeBytes: parsed.normalizedSizeBytes,
    targetMet: parsed.targetMet,
    toleranceMeters: parsed.toleranceMeters,
  };
}

export async function importRaceTrack(
  input: RaceTrackImportInput,
): Promise<RaceTrackImportResult> {
  if (input.mode === 'dry-run') {
    requireLocalTrackImportProject(process.env.NEXT_PUBLIC_SUPABASE_URL);
  }

  const parsed = parseTrackFile(input.bytes);
  const { raceId, eventSlug } = input.raceId
    ? await resolveRaceTrackTargetById(input.raceId)
    : await resolveRaceTrackTargetByName(input.eventSlug, input.raceName);

  if (input.mode === 'apply') {
    await updateRaceTrackGeometry(raceId, parsed.geometry);
  }

  return {
    mode: input.mode,
    raceId,
    eventSlug,
    ...getProcessingSummary(parsed),
  };
}

async function resolveRaceTrackTargetById(
  raceId: string,
): Promise<{ raceId: string; eventSlug: string }> {
  const target = await findRaceTrackTargetById(raceId);

  if (!target) {
    throw new ValidationError('Race not found', 404);
  }

  return { raceId: target.id, eventSlug: target.eventSlug };
}

async function resolveRaceTrackTargetByName(
  eventSlug: string | undefined,
  raceName: string | undefined,
): Promise<{ raceId: string; eventSlug: string }> {
  if (!eventSlug || !raceName) {
    throw new ValidationError('Invalid input', 400);
  }

  const matches = await findRaceTrackTargets(eventSlug, raceName);

  if (matches.length === 0) {
    throw new ValidationError('Race not found', 404);
  }

  if (matches.length > 1) {
    throw new ValidationError('Multiple races match', 409);
  }

  return { raceId: matches[0]!.id, eventSlug };
}

export async function saveRaceTrack(
  input: RaceTrackSaveInput,
): Promise<RaceTrackSaveResult> {
  const parsed = parseTrackFile(input.bytes);
  const race = await findRaceTrackTargetById(input.raceId);

  if (!race) {
    throw new ValidationError('Race not found', 404);
  }

  await updateRaceTrackGeometry(race.id, parsed.geometry);

  return {
    raceId: race.id,
    eventSlug: race.eventSlug,
    ...getProcessingSummary(parsed),
  };
}
