import { parseDraftData } from '@/app/api/events/drafts/[draftId]/validation';
import { ValidationError } from '@/lib/errors';
import type { EventDraftData } from '@/types/event-draft.types';

export function parseDraftProposalBody(text: string): EventDraftData | null {
  if (text.trim() === '') return null;

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ValidationError('Invalid request body', 400);
  }

  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body', 400);
  }

  return parseDraftData((body as Record<string, unknown>).data);
}
