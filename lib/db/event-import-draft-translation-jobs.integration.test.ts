import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const LOCAL_PROJECT_REF = 'wghqldoshvwulyqqbqln';
const RUN_INTEGRATION_TESTS = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const integrationDescribe = RUN_INTEGRATION_TESTS ? describe : describe.skip;

let supabase: SupabaseClient;
const draftIds: string[] = [];
const eventIds: string[] = [];

function projectRefFromUrl(url: string): string {
  return new URL(url).hostname.split('.')[0] ?? '';
}

function draftData(suffix: string) {
  return {
    event: {
      name: `Translated draft ${suffix}`,
      description: 'La prueba se celebra el 4 de octubre de 2027 sobre un recorrido de 12 kilómetros. La salida tiene lugar en Girona.\n\nLa organización ofrece avituallamientos y una bolsa del corredor para los participantes.',
      websiteUrl: `https://example.com/translated-draft-${suffix}`,
    },
    races: [{
      name: 'Integration 12K',
      date: '2027-10-04',
      city: 'Girona',
      province: 'Girona',
      distanceKm: 12,
      elevationGainM: 500,
      tiers: [],
    }],
  };
}

async function createRunningJob(): Promise<string> {
  const { data: draft, error: draftError } = await supabase.rpc(
    'create_event_import_draft',
    { p_data: draftData(randomUUID()), p_source_url: null, p_batch_item_id: null },
  );
  if (draftError || !draft || typeof draft !== 'object' || Array.isArray(draft) || typeof draft.id !== 'string') {
    throw draftError ?? new Error('Failed to create import draft fixture');
  }
  draftIds.push(draft.id);

  const { data: job, error: jobError } = await supabase.rpc(
    'create_event_import_draft_translation_job',
    { p_draft_id: draft.id },
  );
  if (jobError || !job || typeof job !== 'object' || Array.isArray(job) || typeof job.job_id !== 'string') {
    throw jobError ?? new Error('Failed to create translation job fixture');
  }

  const { error: runningError } = await supabase
    .from('event_import_draft_translation_jobs')
    .update({ status: 'running' })
    .eq('id', job.job_id);
  if (runningError) throw runningError;
  return job.job_id;
}

function translationsFixture() {
  return ['ca', 'en', 'fr'].map((locale) => ({
    locale,
    description: `${locale} translated description with 4 2027 and 12 kilometres. It keeps all facts.\n\nThe organisers provide refreshment stations and a runner bag.`,
  }));
}

integrationDescribe('publish_event_import_draft_with_translations integration', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) throw new Error('Supabase integration test environment is missing');
    if (projectRefFromUrl(url) !== LOCAL_PROJECT_REF) {
      throw new Error('Event import translation integration tests can only run locally');
    }
    supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterEach(async () => {
    const eventsToDelete = eventIds.splice(0);
    if (eventsToDelete.length > 0) {
      const { error } = await supabase.from('events').delete().in('id', eventsToDelete);
      if (error) throw error;
    }
    const draftsToDelete = draftIds.splice(0);
    if (draftsToDelete.length > 0) {
      const { error } = await supabase.from('event_import_drafts').delete().in('id', draftsToDelete);
      if (error) throw error;
    }
  });

  it('creates the event, races, and all translations atomically', async () => {
    const jobId = await createRunningJob();
    const { data, error } = await supabase.rpc('publish_event_import_draft_with_translations', {
      p_job_id: jobId,
      p_translations: translationsFixture(),
    });
    expect(error).toBeNull();
    const eventId = (data as { event_id: string }).event_id;
    eventIds.push(eventId);

    const [job, translationsResult] = await Promise.all([
      supabase
        .from('event_import_draft_translation_jobs')
        .select('status, accepted_event_id')
        .eq('id', jobId)
        .single(),
      supabase
        .from('event_translations')
        .select('locale')
        .eq('event_id', eventId)
        .order('locale'),
    ]);
    expect(job.data).toEqual({ status: 'completed', accepted_event_id: eventId });
    expect(translationsResult.data).toEqual([{ locale: 'ca' }, { locale: 'en' }, { locale: 'fr' }]);
  });

  it('does not create an event when translations are incomplete', async () => {
    const jobId = await createRunningJob();
    const { error } = await supabase.rpc('publish_event_import_draft_with_translations', {
      p_job_id: jobId,
      p_translations: [{ locale: 'en', description: 'Incomplete translation.' }],
    });
    expect(error?.code).toBe('P0007');

    const { data: job } = await supabase
      .from('event_import_draft_translation_jobs')
      .select('draft_id')
      .eq('id', jobId)
      .single();
    const { data: draft } = await supabase
      .from('event_import_drafts')
      .select('status, accepted_event_id')
      .eq('id', job?.draft_id)
      .single();
    expect(draft).toEqual({ status: 'draft', accepted_event_id: null });
  });

  it('does not publish when the Spanish source changes during translation', async () => {
    const jobId = await createRunningJob();
    const { data: job } = await supabase
      .from('event_import_draft_translation_jobs')
      .select('draft_id')
      .eq('id', jobId)
      .single();
    const { data: draft } = await supabase
      .from('event_import_drafts')
      .select('data')
      .eq('id', job?.draft_id)
      .single();
    const data = draft?.data as ReturnType<typeof draftData>;
    const { error: updateError } = await supabase
      .from('event_import_drafts')
      .update({
        data: {
          ...data,
          event: {
            ...data.event,
            description: 'La descripción cambió antes de publicar el evento. Conserva dos párrafos.\n\nEl segundo párrafo también contiene información actualizada.',
          },
        },
      })
      .eq('id', job?.draft_id);
    expect(updateError).toBeNull();

    const { error } = await supabase.rpc('publish_event_import_draft_with_translations', {
      p_job_id: jobId,
      p_translations: translationsFixture(),
    });
    expect(error?.code).toBe('P0005');

    const { data: stillDraft } = await supabase
      .from('event_import_drafts')
      .select('status, accepted_event_id')
      .eq('id', job?.draft_id)
      .single();
    expect(stillDraft).toEqual({ status: 'draft', accepted_event_id: null });
  });
});
