import { createStaticClient } from '@/lib/supabase/server';
import type { OrganizerPublic } from '@/types/organizer.types';

type OrganizerRow = {
  name: string | null;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
};

export function organizerRowToPublic(row: OrganizerRow): OrganizerPublic {
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
): Promise<OrganizerPublic | null> {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from('organizers')
    .select('name, website, facebook_url, instagram_url, youtube_url, tiktok_url')
    .eq('id', organizerId)
    .single();

  if (error || !data) {
    return null;
  }

  return organizerRowToPublic(data as OrganizerRow);
}
