import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { context } from '@/tests/fixtures/blog-selection';
import { output } from '@/tests/fixtures/blog-research';
vi.mock('@/lib/supabase/server',() => ({createAdminClient:() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})}));
import { createRun, begin, finish, fail, getRun, listRuns } from './blog-research';
const integration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
let client:SupabaseClient;
const ids:string[] = [];
const events = context.events.map(({id,name}) => ({id,name}));
async function create() {const id = await createRun(context.regionId,events,'openai','test-model');ids.push(id);return getRun(id);}
integration('independent research persistence',() => {
  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (new URL(url).hostname !== 'wghqldoshvwulyqqbqln.supabase.co') throw new Error('Only trailrunningcal-local is allowed');
    client = createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  });
  afterEach(async() => {if(ids.length) {const {error} = await client.from('blog_research_runs').delete().in('id',ids.splice(0));if(error) throw error;}});
  it('creates no draft, stores the region and names and aggregates simultaneous successful completions',async() => {
    const run = await create();expect(run.draftId).toBeNull();expect(run.regionId).toBe(context.regionId);expect(run.regionName).toBe(context.regionName);expect(run).not.toHaveProperty('input');
    expect(new Set(run.results.map(result => result.eventId))).toEqual(new Set(context.events.map(event => event.id)));
    expect(run.results[0]).not.toHaveProperty('position');
    await Promise.all(run.results.map(async result => {await begin(run.id,result.id,'test');await finish(run.id,result.id,output,null);}));
    const completed = await getRun(run.id);expect(completed.status).toBe('completed');expect(completed.results.every(result => result.dossier)).toBe(true);
    expect((await listRuns(null,1)).runs.some(item => item.id === run.id)).toBe(true);
    await finish(run.id,run.results[0].id,null,'late_failure');expect((await getRun(run.id)).results[0].status).toBe('completed');
  });
  it('preserves completed dossiers on failure and supports independent subsequent runs',async() => {
    const first = await create();await begin(first.id,first.results[0].id,'test');await finish(first.id,first.results[0].id,output,null);
    await fail(first.id,'test_failure');expect((await getRun(first.id)).status).toBe('partial');
    const second = await create();await fail(second.id,'start_failed');expect((await getRun(second.id)).status).toBe('failed');
    expect((await getRun(first.id)).results[0].dossier).toEqual(output.dossier);
  });
  it('rejects invalid region and event selections atomically',async() => {
    const before = await client.from('blog_research_runs').select('id',{head:true,count:'exact'}).is('draft_id',null);
    await expect(createRun(context.regionId,events.slice(0,4),'openai','test')).rejects.toBeDefined();
    await expect(createRun(context.regionId,events.map(()=>events[0]),'openai','test')).rejects.toBeDefined();
    expect((await client.from('blog_research_runs').select('id',{head:true,count:'exact'}).is('draft_id',null)).count).toBe(before.count);
  });
});
