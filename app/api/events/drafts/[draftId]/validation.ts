import { parseEventInput } from '@/app/api/events/validation';
import { ValidationError } from '@/lib/errors';
import type { EventDraftData } from '@/types/event-draft.types';

export type DraftActionInput =
  | { action: 'update'; data: EventDraftData }
  | { action: 'accept' }
  | { action: 'reject' };

export function parseDraftActionInput(body: unknown): DraftActionInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  const { action, data } = body as Record<string, unknown>;

  if (action === 'update') {
    if (typeof data !== 'object' || data === null) {
      throw new ValidationError('Invalid draft data', 400);
    }

    const { races } = data as Record<string, unknown>;
    const parsed = parseEventInput({
      ...data,
      races: Array.isArray(races)
        ? races.map((race) =>
            typeof race === 'object' && race !== null
              ? { ...race, tiers: [] }
              : race,
          )
        : races,
    });

    return {
      action,
      data: {
        event: parsed.event,
        races: parsed.races.map((race) => ({
          name: race.name,
          date: race.date,
          city: race.city,
          province: race.province,
          distanceKm: race.distanceKm,
          elevationGainM: race.elevationGainM,
        })),
      },
    };
  }

  if (action === 'accept' || action === 'reject') {
    return { action };
  }

  throw new ValidationError('Invalid draft action', 400);
}
