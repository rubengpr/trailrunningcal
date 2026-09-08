import { updateProfile } from '@/lib/db/profiles';
import type { ProfileInput } from '@/types/profile.types';

export async function updateUserProfile(userId: string, input: ProfileInput) {
  return updateProfile(userId, input);
}
