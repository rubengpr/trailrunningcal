import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type {
  EventDraft,
  EventDraftData,
  EventDraftRow,
} from '@/types/event-draft.types';

function toDraft(row: EventDraftRow): EventDraft {
  return {
    id: row.id,
    eventId: row.event_id,
    status: row.status,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPendingDraftByEventId(
  eventId: string,
): Promise<EventDraft | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_drafts')
    .select('id, event_id, status, data, created_at, updated_at')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    console.error('Pending event draft fetch error:', error);
    throw new Error('Failed to fetch event draft');
  }

  return data ? toDraft(data as EventDraftRow) : null;
}

export async function getPendingDraftById(
  draftId: string,
): Promise<EventDraft | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_drafts')
    .select('id, event_id, status, data, created_at, updated_at')
    .eq('id', draftId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    console.error('Pending event draft fetch error:', error);
    throw new Error('Failed to fetch event draft');
  }

  return data ? toDraft(data as EventDraftRow) : null;
}

export async function getPendingDraftsByEventIds(
  eventIds: string[],
): Promise<EventDraft[]> {
  if (eventIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_drafts')
    .select('id, event_id, status, data, created_at, updated_at')
    .in('event_id', eventIds)
    .eq('status', 'pending');

  if (error) {
    console.error('Pending event drafts fetch error:', error);
    throw new Error('Failed to fetch event drafts');
  }

  return ((data ?? []) as EventDraftRow[]).map(toDraft);
}

export async function createEventDraft(input: {
  eventId: string;
  data: EventDraftData;
}): Promise<EventDraft> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_drafts')
    .insert({
      event_id: input.eventId,
      status: 'pending',
      data: input.data,
    })
    .select('id, event_id, status, data, created_at, updated_at')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      throw new ValidationError('Event already has a pending draft', 409);
    }

    console.error('Event draft create error:', error);
    throw new Error('Failed to create event draft');
  }

  return toDraft(data as EventDraftRow);
}

export async function updateEventDraftData(input: {
  draftId: string;
  data: EventDraftData;
}): Promise<EventDraft> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_drafts')
    .update({
      data: input.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.draftId)
    .eq('status', 'pending')
    .select('id, event_id, status, data, created_at, updated_at')
    .maybeSingle();

  if (error) {
    console.error('Event draft update error:', error);
    throw new Error('Failed to update event draft');
  }

  if (!data) {
    throw new ValidationError('Draft not found', 404);
  }

  return toDraft(data as EventDraftRow);
}

export async function rejectEventDraft(
  draftId: string,
): Promise<EventDraft> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_drafts')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('status', 'pending')
    .select('id, event_id, status, data, created_at, updated_at')
    .maybeSingle();

  if (error) {
    console.error('Event draft reject error:', error);
    throw new Error('Failed to reject event draft');
  }

  if (!data) {
    throw new ValidationError('Draft not found', 404);
  }

  return toDraft(data as EventDraftRow);
}

export async function acceptEventDraft(
  draftId: string,
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('accept_event_draft', {
    p_draft_id: draftId,
  });

  if (error || !data) {
    if (error?.code === 'P0002') {
      throw new ValidationError('Draft not found', 404);
    }

    if (error?.code === 'P0003') {
      throw new ValidationError('Event not found', 404);
    }

    console.error('Event draft accept rpc error:', error);
    throw new Error('Failed to accept event draft');
  }

  return data as string;
}
