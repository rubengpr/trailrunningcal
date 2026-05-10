import { ValidationError } from '@/lib/errors';
import { getOrganizerByOwnerId, getOrganizerRaceCount } from '@/lib/db/organizers';
import { insertRace } from '@/lib/db/races';
import { checkDuplicateRaces } from '@/lib/guards/duplicate-races';
import type { ParsedRaceInput } from '@/app/api/races/validation';

const MAX_RACES_PER_ORGANIZER = 5;

export async function createRace(
  input: ParsedRaceInput,
  userId: string,
  isAdmin: boolean,
): Promise<string> {
  await checkDuplicateRaces([input.websiteUrl]);

  let organizerId: string | null = null;

  if (!isAdmin) {
    const organizer = await getOrganizerByOwnerId(userId);

    if (!organizer) {
      throw new ValidationError('Organizer not found', 404);
    }

    organizerId = organizer.id;

    const count = await getOrganizerRaceCount(organizerId);

    if (count >= MAX_RACES_PER_ORGANIZER) {
      throw new ValidationError(
        'Race limit reached. Maximum 5 races per organizer.',
        403,
      );
    }
  }

  return insertRace({ ...input, organizerId }, isAdmin);
}
