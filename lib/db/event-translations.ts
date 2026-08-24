import { createAdminClient, createStaticClient } from '@/lib/supabase/server';
import { selectUntranslatedEventCandidates } from '@/lib/event-translations/utils';
import type {
  EventTranslation,
  EventTranslationCandidate,
  EventTranslationLocale,
} from '@/types/event-translation.types';
import { EVENT_TRANSLATION_LOCALES } from '@/types/event-translation.types';

type EventTranslationRow = {
  event_id: string;
  locale: EventTranslationLocale;
  description: string;
  created_at: string;
  updated_at: string;
};

const TRANSLATION_SELECTION_PAGE_SIZE = 1_000;

async function getTranslationLocaleRows(
  locales: EventTranslationLocale[],
): Promise<Array<{ event_id: string; locale: EventTranslationLocale }>> {
  const supabase = createAdminClient();
  const rows: Array<{ event_id: string; locale: EventTranslationLocale }> = [];

  for (let from = 0; ; from += TRANSLATION_SELECTION_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('event_translations')
      .select('event_id, locale')
      .in('locale', locales)
      .range(from, from + TRANSLATION_SELECTION_PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch event translation locales:', error);
      throw new Error('Failed to fetch event translation candidates');
    }

    const page = (data ?? []) as Array<{ event_id: string; locale: EventTranslationLocale }>;
    rows.push(...page);
    if (page.length < TRANSLATION_SELECTION_PAGE_SIZE) return rows;
  }
}

function toEventTranslation(row: EventTranslationRow): EventTranslation {
  return {
    eventId: row.event_id,
    locale: row.locale,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
  locales: EventTranslationLocale[] = [...EVENT_TRANSLATION_LOCALES],
): Promise<EventTranslationCandidate[]> {
  const supabase = createAdminClient();
  const [{ data, error }, translations] = await Promise.all([
    supabase
      .from('events')
      .select('id, slug, name, description')
      .not('description', 'is', null)
      .order('updated_at', { ascending: false }),
    getTranslationLocaleRows(locales),
  ]);

  if (error) {
    console.error('Failed to fetch event translation candidates:', error);
    throw new Error('Failed to fetch event translation candidates');
  }

  return selectUntranslatedEventCandidates({
    events: data ?? [],
    translations,
    locales,
    limit,
  });
}

export async function getEventTranslationCandidatesByIds(
  eventIds: string[],
): Promise<EventTranslationCandidate[]> {
  if (eventIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, slug, name, description')
    .in('id', eventIds);

  if (error) {
    console.error('Failed to fetch event translation candidates by ID:', error);
    throw new Error('Failed to fetch event translation candidates');
  }

  return (data ?? []).flatMap((row) => {
    const description = row.description?.trim();
    return description && description.split(/\n\s*\n/).filter((paragraph: string) => paragraph.trim().length > 0).length === 2
      ? [{ id: row.id, slug: row.slug, name: row.name, description }]
      : [];
  });
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

export async function saveEventTranslations(
  inputs: Array<{
    eventId: string;
    locale: EventTranslationLocale;
    description: string;
  }>,
): Promise<EventTranslation[]> {
  if (inputs.length === 0) return [];

  const supabase = createAdminClient();
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('event_translations')
    .upsert(
      inputs.map((input) => ({
        event_id: input.eventId,
        locale: input.locale,
        description: input.description,
        updated_at: updatedAt,
      })),
      { onConflict: 'event_id,locale' },
    )
    .select('event_id, locale, description, created_at, updated_at');

  if (error || !data || data.length !== inputs.length) {
    console.error('Failed to save event translations:', error);
    throw new Error('Failed to save event translations');
  }

  return (data as EventTranslationRow[]).map(toEventTranslation);
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

export async function getPersistedEventTranslations(input: {
  eventIds: string[];
  locales: EventTranslationLocale[];
}): Promise<EventTranslation[]> {
  if (input.eventIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('event_translations')
    .select('event_id, locale, description, created_at, updated_at')
    .in('event_id', input.eventIds)
    .in('locale', input.locales);

  if (error) {
    console.error('Failed to fetch persisted event translations:', error);
    throw new Error('Failed to fetch persisted event translations');
  }

  return ((data ?? []) as EventTranslationRow[]).map(toEventTranslation);
}
