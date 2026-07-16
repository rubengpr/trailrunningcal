import { ValidationError } from '@/lib/errors';
import {
  isValidRaceTierDate,
  validateRaceTierSchedule,
  type RaceTierScheduleValidationError,
} from '@/lib/events/tier-validation';
import { normalizeRaceName } from '@/lib/races/utils';
import type { EventRaceTierWriteInput } from '@/types/event.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
export { ValidationError };

export interface ParsedEventInput {
  event: TrailEventAgentEvent;
  races: ParsedEventRaceInput[];
}

export type ParsedEventRaceInput = Omit<TrailEventAgentRace, 'name'> & {
  name: string | null;
  id?: string;
  tiers: EventRaceTierWriteInput[];
};

export type EventPatchMode = 'update-races' | 'insert-races';

export type ParsedEventPatchInput =
  | {
      mode: 'update-races';
      event: TrailEventAgentEvent;
      races: ParsedEventRaceInput[];
    }
  | {
      mode: 'insert-races';
      event: TrailEventAgentEvent;
      races: ParsedEventRaceInput[];
    };

function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ValidationError('Invalid input', 400);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseEvent(value: unknown): TrailEventAgentEvent {
  if (typeof value !== 'object' || value === null) {
    throw new ValidationError('Invalid event', 400);
  }

  const { name, description, websiteUrl } = value as Record<string, unknown>;

  if (
    typeof name !== 'string' ||
    name.trim().length < 5 ||
    name.trim().length > 200
  ) {
    throw new ValidationError('Invalid event name', 400);
  }

  const parsedWebsiteUrl = parseNullableString(websiteUrl);
  if (parsedWebsiteUrl !== null) {
    try {
      new URL(parsedWebsiteUrl);
    } catch {
      throw new ValidationError('Invalid website URL format', 400);
    }
  }

  return {
    name: name.trim(),
    description: parseNullableString(description),
    websiteUrl: parsedWebsiteUrl,
  };
}

function parseOptionalRaceId(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError('Invalid race id', 400);
  }

  return value.trim();
}

function parseRaceName(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ValidationError('Invalid race name', 400);
  }

  return normalizeRaceName(value);
}

function parseTierDate(value: unknown): string | null {
  const parsed = parseNullableString(value);
  if (parsed === null) return null;

  if (!isValidRaceTierDate(parsed)) {
    throw new ValidationError('Invalid tier date', 400);
  }

  return parsed;
}

function parseTier(value: unknown): EventRaceTierWriteInput {
  if (typeof value !== 'object' || value === null) {
    throw new ValidationError('Invalid tier', 400);
  }

  const { priceEur, endsAt } = value as Record<string, unknown>;
  if (typeof priceEur !== 'number') {
    throw new ValidationError('Invalid tier price', 400);
  }

  const parsedEndsAt = parseTierDate(endsAt);

  return {
    priceEur,
    endsAt: parsedEndsAt,
  };
}

const TIER_VALIDATION_MESSAGES: Record<
  RaceTierScheduleValidationError,
  string
> = {
  tierLimit: 'Too many tiers',
  tierPrice: 'Invalid tier price',
  tierDeadlineRequired: 'Tier deadline required',
  tierDeadline: 'Invalid tier date',
  tierDeadlineOrder: 'Tier deadlines must be strictly increasing',
};

function parseTiers(value: unknown): EventRaceTierWriteInput[] {
  if (!Array.isArray(value)) {
    throw new ValidationError('Invalid tiers', 400);
  }

  const tiers = value.map(parseTier);
  const validationError = validateRaceTierSchedule(tiers);

  if (validationError) {
    throw new ValidationError(TIER_VALIDATION_MESSAGES[validationError], 400);
  }

  return tiers;
}

function parseRace(value: unknown, allowId = false): ParsedEventRaceInput {
  if (typeof value !== 'object' || value === null) {
    throw new ValidationError('Invalid race', 400);
  }

  const {
    id,
    name,
    date,
    city,
    province,
    distanceKm,
    elevationGainM,
    tiers,
  } = value as Record<string, unknown>;

  const parsedDate = parseNullableString(date);

  if (
    typeof city !== 'string' ||
    city.trim().length === 0 ||
    city.trim().length > 100
  ) {
    throw new ValidationError('Invalid city', 400);
  }

  if (
    typeof province !== 'string' ||
    province.trim().length === 0 ||
    province.trim().length > 100
  ) {
    throw new ValidationError('Invalid province', 400);
  }

  if (
    typeof distanceKm !== 'number' ||
    distanceKm <= 0 ||
    distanceKm >= 1000
  ) {
    throw new ValidationError('Invalid distance', 400);
  }

  if (
    elevationGainM !== null &&
    (typeof elevationGainM !== 'number' ||
      !Number.isInteger(elevationGainM) ||
      elevationGainM <= 0 ||
      elevationGainM >= 100000)
  ) {
    throw new ValidationError('Invalid elevation gain', 400);
  }

  const parsedRace: ParsedEventRaceInput = {
    name: parseRaceName(name),
    date: parsedDate,
    city: city.trim(),
    province: province.trim(),
    distanceKm,
    elevationGainM,
    tiers: parseTiers(tiers),
  };

  if (allowId) {
    const parsedId = parseOptionalRaceId(id);
    if (parsedId !== undefined) parsedRace.id = parsedId;
  }

  return parsedRace;
}

export function parseEventInput(body: unknown): ParsedEventInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { event, races } = body as Record<string, unknown>;

  if (!Array.isArray(races)) {
    throw new ValidationError('Invalid races', 400);
  }

  if (races.length === 0) {
    throw new ValidationError('At least one race is required', 400);
  }

  return {
    event: parseEvent(event),
    races: races.map((race) => parseRace(race)),
  };
}

function parsePatchMode(value: unknown): EventPatchMode {
  if (value === 'update-races' || value === 'insert-races') {
    return value;
  }

  throw new ValidationError('Invalid mode', 400);
}

export function parseEventPatchInput(body: unknown): ParsedEventPatchInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { mode: rawMode, event, races } = body as Record<string, unknown>;
  const mode = parsePatchMode(rawMode);

  if (!Array.isArray(races)) {
    throw new ValidationError('Invalid races', 400);
  }

  if (races.length === 0) {
    throw new ValidationError('At least one race is required', 400);
  }

  const parsedEvent = parseEvent(event);

  if (mode === 'update-races') {
    return {
      mode,
      event: parsedEvent,
      races: races.map((race) => parseRace(race, true)),
    };
  }

  return {
    mode,
    event: parsedEvent,
    races: races.map((race) => parseRace(race)),
  };
}
