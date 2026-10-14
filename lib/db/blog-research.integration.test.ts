import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { context } from '@/tests/fixtures/blog-selection';
import { output } from '@/tests/fixtures/blog-research';
vi.mock('@/lib/supabase/server',() => ({createAdminClient:() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})}));
import { begin, claim, fail, finish, getRun, listRuns } from './blog-research';
import { deleteDraft, getDraft } from './blog-drafts';
const integration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
let client: SupabaseClient;
const ids: string[] = [];
async function create() {
  const {data,error} = await client.from('blog_drafts').insert({instructions:'Borrador temporal descartable para probar investigación',status:'completed',generation_context:context,title:'Artículo de prueba temporal',content_html:'<h2>Sección</h2><p>Texto.</p>',primary_keyword:'prueba',slug:'prueba',seo_title:'Prueba',meta_description:'Prueba de investigación.'}).select('id').single();
  if (error) throw error;ids.push(data.id);return data.id as string;
}
integration('local research transactions',() => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (new URL(url).hostname !== 'wghqldoshvwulyqqbqln.supabase.co') throw new Error('Only trailrunningcal-local is allowed');
    client = createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  });
  afterEach(async() => {if(ids.length) {const {error} = await client.from('blog_drafts').delete().in('id',ids.splice(0));if(error) throw error;}});
  it('claims once, preserves order, saves partial results and keeps the article untouched',async() => {
    const id = await create();const original = await getDraft(id);
    const selected = context.events.slice(0,2).map(event => event.id).reverse();
    const claims = await Promise.allSettled([claim(id,selected,'openai','test-model'),claim(id,selected,'openai','test-model')]);
    expect(claims.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    const accepted = claims.find(item => item.status === 'fulfilled');if(accepted?.status !== 'fulfilled') throw new Error('Missing claim');
    const run = await getRun(accepted.value);
    expect(run.results.map(item => item.eventId)).toEqual([...selected].reverse());
    expect(await deleteDraft(id)).toBe(false);
    await Promise.all(run.results.map(item => begin(run.id,item.id,'workflow')));
    await finish(run.id,run.results[0].id,output,null);
    expect((await getRun(run.id)).status).toBe('running');
    await finish(run.id,run.results[1].id,null,'api_error');
    const partial = await getRun(run.id);expect(partial.status).toBe('partial');expect(partial.results.map(item => item.status)).toEqual(['completed','failed']);
    await finish(run.id,run.results[0].id,null,'late_failure');expect((await getRun(run.id)).results[0].status).toBe('completed');
    const current = await getDraft(id);expect(current).toEqual({...original,researchStatus:'partial'});
    const next = await claim(id,[selected[0]],'openai','test-model');await fail(next,'start_failed');
    expect((await listRuns(id,1)).pagination.total).toBe(2);expect((await getRun(next)).status).toBe('failed');
    expect(await deleteDraft(id)).toBe(true);
    expect((await client.from('blog_research_runs').select('id').eq('draft_id',id)).data).toEqual([]);
    expect((await client.from('blog_research_results').select('id').eq('run_id',run.id)).data).toEqual([]);
  });
  it('cannot delete and start research concurrently',async() => {
    const id = await create();
    const [deleted,research] = await Promise.allSettled([deleteDraft(id),claim(id,[context.events[0].id],'openai','test')]);
    const removed = deleted.status === 'fulfilled' && deleted.value;
    expect(Number(removed)+Number(research.status === 'fulfilled')).toBe(1);
    if(research.status === 'fulfilled') await fail(research.value,'test_finished');
  });
  it('invalid selections roll back without creating a run or blocking the article',async() => {
    const id = await create();
    await expect(claim(id,[crypto.randomUUID()],'openai','test')).rejects.toMatchObject({status:422});
    expect((await listRuns(id,1)).runs).toEqual([]);expect((await getDraft(id))?.researchStatus).toBe('not_started');
  });
  it('completes all successful events atomically and keeps diagnostic metadata private',async() => {
    const id = await create();const runId = await claim(id,context.events.map(item => item.id),'openai','test');const run = await getRun(runId);
    await Promise.all(run.results.map(async result => {await begin(runId,result.id,'workflow');await finish(runId,result.id,output,null);}));
    expect((await getRun(runId)).status).toBe('completed');expect((await getDraft(id))?.researchStatus).toBe('completed');
    const raw = await client.from('blog_research_results').select('response_id,search_calls').eq('run_id',runId);
    expect(raw.data?.every(item => item.response_id === output.responseId && item.search_calls === 2)).toBe(true);
    expect(JSON.stringify(await getRun(runId))).not.toContain('responseId');
  });
});
