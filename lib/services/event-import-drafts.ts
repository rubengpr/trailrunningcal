import { ValidationError } from '@/lib/errors';
import {
  acceptEventImportDraft as acceptInDatabase,
  createEventImportDraft as createInDatabase,
  getEventImportDraft,
  getEventImportDrafts,
  rejectEventImportDraft as rejectInDatabase,
  updateEventImportDraft as updateInDatabase,
} from '@/lib/db/event-import-drafts';
import type { EventImportDraftData } from '@/types/event-import-draft.types';

export async function createDraft(input: {
  data: EventImportDraftData;
  sourceUrl?: string | null;
  batchItemId?: string | null;
}) {
  return createInDatabase(input);
}

export async function listDrafts() {
  return getEventImportDrafts();
}

export async function getDraft(id: string) {
  return getEventImportDraft(id);
}

export async function updateDraft(id: string, data: EventImportDraftData) {
  const draft = await updateInDatabase(id, data);
  if (!draft) throw new ValidationError('Draft not found', 404);
  return draft;
}

export async function rejectDraft(id: string) {
  if (!await rejectInDatabase(id)) throw new ValidationError('Draft not found', 404);
}

export async function acceptDraft(id: string) {
  return acceptInDatabase(id);
}
