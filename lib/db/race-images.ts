import type { SupabaseClient } from '@supabase/supabase-js';

export async function getImageFilename(
  supabase: SupabaseClient,
  organizerId: string,
  raceId: string,
): Promise<string | null> {
  const { data, error } = await supabase.from('races')
    .select('hero_image_filename')
    .eq('id', raceId)
    .eq('organizer_id', organizerId)
    .maybeSingle();
  if (error) {
    console.error('Race image filename read error:', error);
    throw new Error('Failed to read race image');
  }
  return data?.hero_image_filename ?? null;
}

export async function updateImageFilename(
  supabase: SupabaseClient,
  input: {
    organizerId: string;
    raceId: string;
    expectedFilename: string | null;
    filename: string | null;
  },
): Promise<boolean> {
  const update = supabase.from('races')
    .update({ hero_image_filename: input.filename })
    .eq('id', input.raceId)
    .eq('organizer_id', input.organizerId);
  const { data, error } = await (input.expectedFilename === null
    ? update.is('hero_image_filename', null)
    : update.eq('hero_image_filename', input.expectedFilename))
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Race image filename update error:', error);
    throw new Error('Failed to update race');
  }
  return data !== null;
}
