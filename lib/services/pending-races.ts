import { createAdminClient } from '@/lib/supabase/server';
import { normalizeUrl } from '@/lib/validation';
import { isUrlInRaces, isUrlInPendingRaces, insertPendingRace } from '@/lib/db/pending-races';
import type { PendingRace } from '@/types/pending-race.types';

export type AddPendingRacesResult = {
  added: PendingRace[];
  skipped: { url: string; reason: string }[];
};

export async function createPendingRaces(rawUrls: string[]): Promise<AddPendingRacesResult> {
  const supabase = createAdminClient();
  const added: PendingRace[] = [];
  const skipped: { url: string; reason: string }[] = [];

  for (const rawUrl of rawUrls) {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) continue;

    const normalizedUrl = normalizeUrl(rawUrl.trim());

    try {
      new URL(normalizedUrl);
    } catch {
      skipped.push({ url: rawUrl.trim(), reason: 'invalidUrl' });
      continue;
    }

    try {
      const [inRaces, inPending] = await Promise.all([
        isUrlInRaces(supabase, normalizedUrl),
        isUrlInPendingRaces(supabase, normalizedUrl),
      ]);

      if (inRaces) {
        skipped.push({ url: normalizedUrl, reason: 'alreadyInRaces' });
        continue;
      }

      if (inPending) {
        skipped.push({ url: normalizedUrl, reason: 'alreadyInQueue' });
        continue;
      }

      const entry = await insertPendingRace(supabase, normalizedUrl);
      if (!entry) {
        skipped.push({ url: normalizedUrl, reason: 'insertFailed' });
        continue;
      }

      added.push(entry);
    } catch {
      skipped.push({ url: normalizedUrl, reason: 'lookupFailed' });
    }
  }

  return { added, skipped };
}
