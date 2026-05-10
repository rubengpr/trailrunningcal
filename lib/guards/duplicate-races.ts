import { DuplicateRaceError } from '@/lib/errors';
import { getUrlConflicts } from '@/lib/db/races';

export async function checkDuplicateRaces(urls: string[]): Promise<void> {
  const conflicts = await getUrlConflicts(urls);
  if (conflicts.length > 0) {
    throw new DuplicateRaceError(conflicts);
  }
}
