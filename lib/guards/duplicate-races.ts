import { DuplicateRaceError } from '@/lib/errors';
import { getFutureRacesByUrl } from '@/lib/db/races';

export async function checkDuplicateRaces(urls: string[]): Promise<void> {
  const conflicts = await getFutureRacesByUrl(urls);
  if (conflicts.length > 0) {
    throw new DuplicateRaceError(conflicts);
  }
}
