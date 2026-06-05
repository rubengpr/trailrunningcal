import { DuplicateRaceError } from '@/lib/errors';
import { getEventsByUrl } from '@/lib/db/events';

export async function checkDuplicateEvents(urls: string[]): Promise<void> {
  const conflicts = await getEventsByUrl(urls);
  if (conflicts.length > 0) {
    throw new DuplicateRaceError(
      conflicts.map((event) => ({
        id: event.id,
        name: event.name,
        date: '',
        websiteUrl: event.websiteUrl,
      })),
    );
  }
}
