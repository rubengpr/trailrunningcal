import { createClient, createStaticClient } from '@/lib/supabase/server';
import type { Organizer } from '@/types/organizer.types';

type OrganizerRow = {
  name: string | null;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
};

export function toOrganizer(row: OrganizerRow): Organizer {
  return {
    name: row.name ?? null,
    website: row.website ?? null,
    facebookUrl: row.facebook_url ?? null,
    instagramUrl: row.instagram_url ?? null,
    youtubeUrl: row.youtube_url ?? null,
    tiktokUrl: row.tiktok_url ?? null,
  };
}

export async function getOrganizerById(
  organizerId: string,
): Promise<Organizer | null> {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from('organizers')
    .select('name, website, facebook_url, instagram_url, youtube_url, tiktok_url')
    .eq('id', organizerId)
    .single();

  if (error || !data) {
    return null;
  }

  return toOrganizer(data as OrganizerRow);
}

export async function getOrganizerByOwnerId(
  ownerId: string,
): Promise<{ id: string } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizers')
    .select('id')
    .eq('owner_id', ownerId)
    .single();

  if (error || !data) {
    return null;
  }

  return { id: data.id };
}

export async function updateOrganizer(
  ownerId: string,
  input: {
    organizationName: string;
    organizationWebsite?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    tiktokUrl?: string;
  },
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizers')
    .update({
      name: input.organizationName,
      website: input.organizationWebsite,
      facebook_url: input.facebookUrl,
      instagram_url: input.instagramUrl,
      youtube_url: input.youtubeUrl,
      tiktok_url: input.tiktokUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('owner_id', ownerId)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to update organizer');
  }

  return data;
}
