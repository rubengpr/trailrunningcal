import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    createAdminClient: () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    ),
  };
});
import { getDraft, listDrafts } from './blog-drafts';

const integrationDescribe = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
integrationDescribe('local seeded blog drafts (read only)', () => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || new URL(url).hostname !== 'wghqldoshvwulyqqbqln.supabase.co') {
      throw new Error('Integration check requires trailrunningcal-local');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing service key');
  });
  it('reads the seeded summaries and scores', async () => {
    const result = await listDrafts(1);
    expect(result.drafts.find(d => d.instructions === 'Crea una guía práctica para corredores que quieren elegir su primera carrera de trail en España. Explica cómo valorar distancia, desnivel y terreno.')?.score).toBeNull();
    expect(result.drafts.find(d => d.title === 'Cómo organizar tu temporada de carreras de montaña')?.score).toBeNull();
  });
  it('reads seeded HTML but hides legacy evaluations until rescored', async () => {
    const page = await listDrafts(1);
    const summary = page.drafts.find(d => d.instructions === 'Crea una guía práctica para corredores que quieren elegir su primera carrera de trail en España. Explica cómo valorar distancia, desnivel y terreno.')!;
    const draft = await getDraft(summary.id);
    expect(draft?.contentHtml).toContain('<h2>');
    expect(draft?.evaluationStatus).toBe('not_evaluated');
    expect(draft?.evaluation).toBeNull();
    expect(await getDraft('00000000-0000-4000-8000-000000000000')).toBeNull();
  });
});
