import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const integrationDescribe = process.env.RUN_SUPABASE_SECURITY_TESTS === 'true'
  ? describe
  : describe.skip;

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

function createAnonymousClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase public integration test credentials');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

integrationDescribe('anonymous Supabase access', () => {
  it('allows every read required by public pages', async () => {
    const supabase = createAnonymousClient();
    const results = await Promise.all([
      supabase
        .from('events')
        .select('id, name, slug, website_url, organizer_id, description, hero_image_filename, updated_at')
        .limit(1),
      supabase
        .from('races')
        .select('id, name, date, distance_km, elevation_gain_m, city, province, map_url, legacy_slug, event_id, race_tiers ( price_eur )')
        .limit(1),
      supabase
        .from('city_locations')
        .select('city, province, latitude, longitude')
        .limit(1),
      supabase
        .from('organizers')
        .select('id, name, website, facebook_url, instagram_url, youtube_url, tiktok_url')
        .limit(1),
      supabase.rpc('get_events_with_races'),
      supabase.rpc('get_recommended_events', {
        p_province: 'Barcelona',
        p_exclude_event_id: ZERO_UUID,
        p_after_date: '2099-01-01',
        p_limit: 1,
      }),
    ]);

    for (const result of results) {
      expect(result.error).toBeNull();
    }
  });

  it('denies sensitive tables and non-public columns', async () => {
    const supabase = createAnonymousClient();
    const sensitiveTables = [
      'profiles',
      'event_drafts',
      'pending_events',
      'pending_races',
      'event_import_batches',
      'event_import_batch_items',
      'event_description_batches',
      'event_description_batch_items',
      'race_import_batches',
      'race_import_batch_items',
    ];
    const results = await Promise.all([
      ...sensitiveTables.map((table) => supabase.from(table).select('*').limit(1)),
      supabase.from('organizers').select('owner_id').limit(1),
      supabase.from('events').select('created_at').limit(1),
      supabase.from('races').select('organizer_id, created_at, updated_at').limit(1),
      supabase.from('race_tiers').select('id, starts_at, ends_at').limit(1),
    ]);

    for (const result of results) {
      expect(result.error?.code).toBe('42501');
    }
  });

  it('denies anonymous writes and non-public RPCs', async () => {
    const supabase = createAnonymousClient();
    const results = await Promise.all([
      supabase.from('events').insert({ name: 'Denied', slug: 'denied' }),
      supabase.rpc('is_app_admin'),
      supabase.rpc('accept_event_draft', { p_draft_id: ZERO_UUID }),
      supabase.rpc('create_event_description_batch', { p_event_ids: null, p_model: null }),
      supabase.rpc('create_event_edition', {
        p_event_id: ZERO_UUID,
        p_event: null,
        p_races: null,
      }),
      supabase.rpc('create_event_import_batch', { p_urls: null, p_model: null }),
      supabase.rpc('create_event_with_races', { p_event: null, p_races: null }),
      supabase.rpc('create_race_import_batch', { p_urls: null, p_model: null }),
      supabase.rpc('update_event_with_races', {
        p_event_id: ZERO_UUID,
        p_event: null,
        p_races: null,
      }),
    ]);

    for (const result of results) {
      expect(result.error?.code).toBe('42501');
    }
  });
});
