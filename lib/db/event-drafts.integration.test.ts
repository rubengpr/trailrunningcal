import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { rejectEventDraft, updateEventDraftData } from './event-drafts';

const LOCAL_PROJECT_REF = 'wghqldoshvwulyqqbqln';
const RUN_INTEGRATION_TESTS =
  process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const integrationDescribe = RUN_INTEGRATION_TESTS ? describe : describe.skip;

let supabase: SupabaseClient;
const eventIds: string[] = [];

function projectRefFromUrl(url: string): string {
  return new URL(url).hostname.split('.')[0] ?? '';
}

async function createEventFixture(label: string): Promise<string> {
  const suffix = randomUUID();
  const { data, error } = await supabase
    .from('events')
    .insert({
      name: `${label} ${suffix}`,
      slug: `event-draft-test-${suffix}`,
      website_url: 'https://example.com/original',
      description: 'Original description',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create event fixture');
  }

  eventIds.push(data.id as string);
  return data.id as string;
}

async function createDraftFixture(
  eventId: string,
  distanceKm: number | string,
): Promise<string> {
  const { data, error } = await supabase
    .from('event_drafts')
    .insert({
      event_id: eventId,
      status: 'pending',
      data: {
        event: {
          name: 'Updated integration event',
          websiteUrl: 'https://example.com/updated',
          description: 'Updated description',
        },
        races: [
          {
            name: 'Integration Race 21K',
            date: '2027-05-01',
            city: 'Barcelona',
            province: 'Barcelona',
            distanceKm,
            elevationGainM: 900,
          },
        ],
      },
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create draft fixture');
  }

  return data.id as string;
}

integrationDescribe('accept_event_draft integration', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error('Supabase integration test environment is missing');
    }

    if (projectRefFromUrl(url) !== LOCAL_PROJECT_REF) {
      throw new Error('Event draft integration tests can only run locally');
    }

    supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterEach(async () => {
    if (eventIds.length === 0) return;

    const idsToDelete = eventIds.splice(0);
    const { error } = await supabase.from('events').delete().in('id', idsToDelete);

    if (error) throw error;
  });

  it('updates the event, inserts races, and accepts the draft atomically', async () => {
    const eventId = await createEventFixture('Accept');
    const draftId = await createDraftFixture(eventId, 21);

    const { data: acceptedEventId, error: acceptError } = await supabase.rpc(
      'accept_event_draft',
      { p_draft_id: draftId },
    );

    expect(acceptError).toBeNull();
    expect(acceptedEventId).toBe(eventId);

    const [eventResult, racesResult, draftResult] = await Promise.all([
      supabase
        .from('events')
        .select('name, website_url, description')
        .eq('id', eventId)
        .single(),
      supabase
        .from('races')
        .select('name, date, distance_km, elevation_gain_m, website_url')
        .eq('event_id', eventId),
      supabase
        .from('event_drafts')
        .select('status')
        .eq('id', draftId)
        .single(),
    ]);

    expect(eventResult.error).toBeNull();
    expect(eventResult.data).toEqual({
      name: 'Updated integration event',
      website_url: 'https://example.com/updated',
      description: 'Updated description',
    });
    expect(racesResult.error).toBeNull();
    expect(racesResult.data).toEqual([
      {
        name: 'Integration Race 21K',
        date: '2027-05-01',
        distance_km: 21,
        elevation_gain_m: 900,
        website_url: 'https://example.com/updated',
      },
    ]);
    expect(draftResult.error).toBeNull();
    expect(draftResult.data).toEqual({ status: 'accepted' });
  });

  it('rolls back every write when a race cannot be inserted', async () => {
    const eventId = await createEventFixture('Rollback');
    const draftId = await createDraftFixture(eventId, 'invalid-distance');

    const { error: acceptError } = await supabase.rpc('accept_event_draft', {
      p_draft_id: draftId,
    });

    expect(acceptError).not.toBeNull();

    const [eventResult, racesResult, draftResult] = await Promise.all([
      supabase
        .from('events')
        .select('website_url, description')
        .eq('id', eventId)
        .single(),
      supabase.from('races').select('id').eq('event_id', eventId),
      supabase
        .from('event_drafts')
        .select('status')
        .eq('id', draftId)
        .single(),
    ]);

    expect(eventResult.data).toEqual({
      website_url: 'https://example.com/original',
      description: 'Original description',
    });
    expect(racesResult.data).toEqual([]);
    expect(draftResult.data).toEqual({ status: 'pending' });
  });

  it('persists edits, rejects the draft, and prevents later edits', async () => {
    const eventId = await createEventFixture('Edit and reject');
    const draftId = await createDraftFixture(eventId, 21);
    const updatedData = {
      event: {
        name: 'Edited integration event',
        websiteUrl: 'https://example.com/edited',
        description: 'Edited description',
      },
      races: [
        {
          name: 'Edited Integration Race 42K',
          date: '2027-06-01',
          city: 'Girona',
          province: 'Girona',
          distanceKm: 42,
          elevationGainM: 1800,
        },
      ],
    };

    const updatedDraft = await updateEventDraftData({ draftId, data: updatedData });
    expect(updatedDraft.data).toEqual(updatedData);

    const rejectedDraft = await rejectEventDraft(draftId);
    expect(rejectedDraft.status).toBe('rejected');

    await expect(
      updateEventDraftData({ draftId, data: updatedData }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('enforces one pending draft per event', async () => {
    const eventId = await createEventFixture('Unique pending');
    await createDraftFixture(eventId, 21);

    const { error } = await supabase.from('event_drafts').insert({
      event_id: eventId,
      status: 'pending',
      data: {
        event: {
          name: 'Second pending draft',
          websiteUrl: 'https://example.com/second',
          description: null,
        },
        races: [
          {
            name: 'Second Race',
            date: '2027-07-01',
            city: 'Lleida',
            province: 'Lleida',
            distanceKm: 10,
            elevationGainM: 400,
          },
        ],
      },
    });

    expect(error?.code).toBe('23505');
  });
});
