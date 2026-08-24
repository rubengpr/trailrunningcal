import { createAdminClient, createStaticClient } from '@/lib/supabase/server';
import type {
  EventTranslation,
  EventTranslationCandidate,
  EventTranslationLocale,
} from '@/types/event-translation.types';

type EventTranslationRow = {
  event_id: string;
  locale: EventTranslationLocale;
  description: string;
  created_at: string;
  updated_at: string;
};

function toEventTranslation(row: EventTranslationRow): EventTranslation {
  return {
    eventId: row.event_id,
    locale: row.locale,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hasExactlyTwoParagraphs(description: string): boolean {
  return description
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0).length === 2;
}

export async function getEventTranslation(
  eventId: string,
  locale: EventTranslationLocale,
): Promise<string | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from('event_translations')
    .select('description')
    .eq('event_id', eventId)
    .eq('locale', locale)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch event translation:', error);
    return null;
  }

  return data?.description ?? null;
}

export async function getEventTranslationCandidates(
  limit: number,
): Promise<EventTranslationCandidate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, slug, name, description')
    .not('description', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch event translation candidates:', error);
    throw new Error('Failed to fetch event translation candidates');
  }

  return (data ?? []).flatMap((row) => {
    const description = row.description?.trim();
    return description && hasExactlyTwoParagraphs(description)
      ? [{ id: row.id, slug: row.slug, name: row.name, description }]
      : [];
  }).slice(0, limit);
}

export async function saveEventTranslation(input: {
  eventId: string;
  locale: EventTranslationLocale;
  description: string;
}): Promise<EventTranslation> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('event_translations')
    .upsert(
      {
        event_id: input.eventId,
        locale: input.locale,
        description: input.description,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,locale' },
    )
    .select('event_id, locale, description, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('Failed to save event translation:', error);
    throw new Error('Failed to save event translation');
  }

  return toEventTranslation(data as EventTranslationRow);
}

export async function hasEventTranslation(input: {
  eventId: string;
  locale: EventTranslationLocale;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('event_translations')
    .select('event_id')
    .eq('event_id', input.eventId)
    .eq('locale', input.locale)
    .maybeSingle();

  if (error) {
    console.error('Failed to check event translation:', error);
    throw new Error('Failed to check event translation');
  }

  return data !== null;
}
