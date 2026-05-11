import { createClient } from '@/lib/supabase/server';
import type { ProfileInput } from '@/app/api/profiles/validation';

export async function updateProfile(userId: string, input: ProfileInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: input.userName,
      job_title: input.userRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to update profile');
  }

  return data;
}
