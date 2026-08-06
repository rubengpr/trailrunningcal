import {
  assertRequestBody,
  ValidationError,
} from '@/app/api/request-validation';
import { PUBLIC_EVENT_LOCATION_BATCH_SIZE } from '@/lib/events/map';
import type { EventMapLocationKey } from '@/types/map.types';

const MAX_LOCATION_VALUE_LENGTH = 100;

function locationKey(location: EventMapLocationKey): string {
  return `${location.city}\u0000${location.province}`;
}

export function parseEventMapLocations(
  body: unknown,
): EventMapLocationKey[] {
  assertRequestBody(body);

  if (!Array.isArray(body.locations)) {
    throw new ValidationError('Invalid locations', 400);
  }

  if (body.locations.length > PUBLIC_EVENT_LOCATION_BATCH_SIZE) {
    throw new ValidationError('Too many locations', 400);
  }

  const locationsByKey = new Map<string, EventMapLocationKey>();
  for (const value of body.locations) {
    if (typeof value !== 'object' || value === null) {
      throw new ValidationError('Invalid location', 400);
    }

    const location = value as Record<string, unknown>;
    if (
      typeof location.city !== 'string' ||
      typeof location.province !== 'string'
    ) {
      throw new ValidationError('Invalid location', 400);
    }

    const city = location.city.trim();
    const province = location.province.trim();
    if (
      city.length === 0 ||
      province.length === 0 ||
      city.length > MAX_LOCATION_VALUE_LENGTH ||
      province.length > MAX_LOCATION_VALUE_LENGTH
    ) {
      throw new ValidationError('Invalid location', 400);
    }

    const parsedLocation = { city, province };
    locationsByKey.set(locationKey(parsedLocation), parsedLocation);
  }

  return [...locationsByKey.values()];
}
