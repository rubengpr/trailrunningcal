import {
  deletePendingEvent,
  enqueuePendingEvents,
} from '@/lib/db/pending-events';
import type { PendingEvent, SkippedUrl } from '@/types/pending-event.types';

export type AddPendingEventsResult = {
  added: PendingEvent[];
  skipped: SkippedUrl[];
};

export async function removePendingEvent(id: string): Promise<void> {
  await deletePendingEvent(id);
}

export async function createPendingEvents(
  urls: string[],
): Promise<AddPendingEventsResult> {
  return enqueuePendingEvents(urls);
}
