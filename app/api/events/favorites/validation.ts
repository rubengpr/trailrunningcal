import {
  assertRequestBody,
  ValidationError,
} from '@/app/api/request-validation';

const MAX_FAVORITE_EVENT_IDS = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseEventId(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError('Invalid event id', 400);
  }

  return value;
}

export function parseFavoriteEventIds(body: unknown): string[] {
  assertRequestBody(body);

  if (!Array.isArray(body.eventIds)) {
    throw new ValidationError('Invalid event ids', 400);
  }

  if (body.eventIds.length > MAX_FAVORITE_EVENT_IDS) {
    throw new ValidationError('Too many event ids', 400);
  }

  return Array.from(
    new Set(
      body.eventIds.map((eventId) => {
        if (typeof eventId !== 'string') {
          throw new ValidationError('Invalid event id', 400);
        }

        return parseEventId(eventId.trim());
      }),
    ),
  );
}
