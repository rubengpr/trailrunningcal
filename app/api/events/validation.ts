import { ValidationError } from '@/lib/errors';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
export { ValidationError };

export interface ParsedEventInput {
  event: TrailEventAgentEvent;
  races: TrailEventAgentRace[];
}

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

function parseRace(value: unknown): TrailEventAgentRace {
  if (typeof value !== 'object' || value === null) {
    throw new ValidationError('Invalid race', 400);
  }

  const {
    name,
    date,
    city,
    province,
    distanceKm,
    elevationGainM,
  } = value as Record<string, unknown>;

  if (
    typeof name !== 'string' ||
    name.trim().length < 5 ||
    name.trim().length > 200
  ) {
    throw new ValidationError('Invalid race name', 400);
  }

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

  return {
    name: name.trim(),
    date: parsedDate,
    city: city.trim(),
    province: province.trim(),
    distanceKm,
    elevationGainM,
  };
}

export function parseEventInput(body: unknown): ParsedEventInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { event, races } = body as Record<string, unknown>;

  if (!Array.isArray(races)) {
    throw new ValidationError('Invalid races', 400);
  }

  return {
    event: parseEvent(event),
    races: races.map(parseRace),
  };
}
