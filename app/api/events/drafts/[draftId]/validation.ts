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
    return { action, data: parseEventInput(data) };
  }

  if (action === 'accept' || action === 'reject') {
    return { action };
  }

  throw new ValidationError('Invalid draft action', 400);
}
