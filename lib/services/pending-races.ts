import { createAdminClient } from '@/lib/supabase/server';
import { isUrlInRaces, isUrlInPendingRaces, insertPendingRace } from '@/lib/db/pending-races';
import type { PendingRace, SkippedUrl } from '@/types/pending-race.types';

export type AddPendingRacesResult = {
  added: PendingRace[];
  skipped: SkippedUrl[];
};

export async function createPendingRaces(urls: string[]): Promise<AddPendingRacesResult> {
  const supabase = createAdminClient();
  const added: PendingRace[] = [];
  const skipped: SkippedUrl[] = [];

  for (const url of urls) {
    try {
      const [inRaces, inPending] = await Promise.all([
        isUrlInRaces(supabase, url),
        isUrlInPendingRaces(supabase, url),
      ]);

      if (inRaces) {
        skipped.push({ url, reason: 'alreadyInRaces' });
        continue;
      }

      if (inPending) {
        skipped.push({ url, reason: 'alreadyInQueue' });
        continue;
      }

      const entry = await insertPendingRace(supabase, url);
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
