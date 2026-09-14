import type { SupabaseClient } from '@supabase/supabase-js';
import { getEventByIdForOrganizer } from '@/lib/db/events';
import type { TrailEventDetail } from '@/types/event.types';

export interface OrganizerRaceContext {
  organizerId: string;
  heroImageFilename: string | null;
}

export interface OrganizerEventContext {
  organizerId: string;
  event: TrailEventDetail;
}

async function getOrganizerIdForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: organizer, error: organizerError } = await supabase
    .from('organizers')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (organizerError || !organizer) {
    return null;
  }

  return organizer.id;
}

export async function getOrganizerRaceContext(
  supabase: SupabaseClient,
  userId: string,
  raceId: string,
): Promise<OrganizerRaceContext | null> {
  const organizerId = await getOrganizerIdForUser(supabase, userId);
  if (!organizerId) {
    return null;
  }

  const { data: raceRow, error: raceError } = await supabase
    .from('races')
    .select('organizer_id, hero_image_filename')
    .eq('id', raceId)
    .single();

  if (raceError || !raceRow) {
    return null;
  }

  if (raceRow.organizer_id !== organizerId) {
    return null;
  }

  return {
    organizerId,
    heroImageFilename: raceRow.hero_image_filename,
  };
}

export async function getOrganizerEventContext(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<OrganizerEventContext | null> {
  const organizerId = await getOrganizerIdForUser(supabase, userId);
  if (!organizerId) {
    return null;
  }

  const event = await getEventByIdForOrganizer(eventId, organizerId);
  if (!event) {
    return null;
  }

  return {
    organizerId,
    event,
  };
}

export async function getRaceAccessContext(
  supabase: SupabaseClient,
  userId: string,
  raceId: string,
  isAdmin: boolean,
): Promise<OrganizerRaceContext | null> {
  if (!isAdmin) {
    return getOrganizerRaceContext(supabase, userId, raceId);
  }

  const { data, error } = await supabase
    .from('races')
    .select('organizer_id, hero_image_filename')
    .eq('id', raceId)
    .single();

  if (error || !data) {
    return null;
  }

  if (!data.organizer_id) {
    return null;
  }

  return {
    organizerId: data.organizer_id,
    heroImageFilename: data.hero_image_filename,
  };
}
