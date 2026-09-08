import { updateOrganizer } from '@/lib/db/organizers';
import type { OrganizerInput } from '@/types/organizer-input.types';

export async function updateUserOrganizer(
  userId: string,
  input: OrganizerInput,
) {
  return updateOrganizer(userId, input);
}
