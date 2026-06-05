import { createAdminClient } from '@/lib/supabase/server';
import {
  isUrlInEvents,
  isUrlInPendingEvents,
  insertPendingEvent,
} from '@/lib/db/pending-events';
import type { PendingEvent, SkippedUrl } from '@/types/pending-event.types';

export type AddPendingEventsResult = {
  added: PendingEvent[];
  skipped: SkippedUrl[];
};

export async function createPendingEvent(
  url: string,
): Promise<PendingEvent | null> {
  const supabase = createAdminClient();

  const exists = await isUrlInPendingEvents(supabase, url);
  if (exists) throw new Error('URL already exists in pending events');

  return insertPendingEvent(supabase, url);
}

export async function createPendingEvents(
  urls: string[],
): Promise<AddPendingEventsResult> {
  const supabase = createAdminClient();
  const added: PendingEvent[] = [];
  const skipped: SkippedUrl[] = [];

  for (const url of urls) {
    try {
      const [inEvents, inPending] = await Promise.all([
        isUrlInEvents(supabase, url),
        isUrlInPendingEvents(supabase, url),
      ]);

      if (inEvents) {
        skipped.push({ url, reason: 'alreadyInEvents' });
        continue;
      }

      if (inPending) {
        skipped.push({ url, reason: 'alreadyInQueue' });
        continue;
      }

      const entry = await insertPendingEvent(supabase, url);
      if (!entry) {
        skipped.push({ url, reason: 'insertFailed' });
        continue;
      }

      added.push(entry);
    } catch {
      skipped.push({ url, reason: 'lookupFailed' });
    }
  }

  return { added, skipped };
}
