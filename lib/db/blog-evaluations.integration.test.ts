import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
vi.mock('@/lib/supabase/server',async()=>{
  const {createClient}=await import('@supabase/supabase-js');
  return {createAdminClient:()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})};
});
import { begin, claim, fail, save } from './blog-evaluations';
import type { Evaluation } from '@/types/blog-evaluation.types';

const integration=process.env.RUN_SUPABASE_INTEGRATION_TESTS==='true'?describe:describe.skip;
let client:SupabaseClient;
let anon:SupabaseClient;
const ids:string[]=[];
const evaluation:Evaluation={
  score:80,criteria:[
    {category:'utility',deterministic:0,llm:24,score:24,maximum:30,explanation:'Prueba',evidence:[]},
    {category:'rigor',deterministic:0,llm:20,score:20,maximum:25,explanation:'Prueba',evidence:[]},
    {category:'structure',deterministic:5,llm:7,score:12,maximum:15,explanation:'Prueba',evidence:[]},
    {category:'metadata',deterministic:8,llm:8,score:16,maximum:20,explanation:'Prueba',evidence:[]},
    {category:'clarity',deterministic:0,llm:8,score:8,maximum:10,explanation:'Prueba',evidence:[]},
  ],criticalErrors:[],recommendations:[],createdAt:new Date().toISOString(),
};
async function create() {
  const {data,error}=await client.from('blog_drafts').insert({
    instructions:'Prueba de evaluación transaccional',status:'completed',title:'Artículo de prueba de evaluación',
    content_html:'<h2>Sección</h2><p>Contenido.</p>',primary_keyword:'prueba evaluación',
    slug:'prueba-evaluacion',seo_title:'Evaluación',meta_description:'Descripción',
  }).select('id').single();
  if(error)throw error;
  ids.push(data.id);return data.id as string;
}
integration('local evaluation lifecycle and transaction',()=>{
  beforeAll(()=>{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if(!url || new URL(url).hostname!=='wghqldoshvwulyqqbqln.supabase.co')throw new Error('Local project required');
    client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
    anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  });
  afterEach(async()=>{if(ids.length)await client.from('blog_drafts').delete().in('id',ids.splice(0));});
  it('claims once under concurrent requests and commits atomically',async()=>{
    const id=await create();
    const attempts=await Promise.all([claim(id),claim(id)]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    const attempt=attempts.find(Boolean)!;
    await begin(id,'test-run',attempt);
    await expect(save(id,'test-run',{...evaluation,score:101},attempt)).rejects.toBeTruthy();
    expect((await client.from('blog_drafts').select('evaluation_status').eq('id',id).single()).data?.evaluation_status).toBe('running');
    expect((await client.from('blog_draft_evaluations').select('draft_id').eq('draft_id',id)).data).toEqual([]);
    await save(id,'test-run',evaluation,attempt);
    expect((await client.from('blog_drafts').select('status,evaluation_status').eq('id',id).single()).data).toEqual({status:'completed',evaluation_status:'completed'});
    expect((await client.from('blog_draft_evaluations').select('score').eq('draft_id',id).single()).data?.score).toBe(80);
    await save(id,'test-run',{...evaluation,score:90},attempt);
    expect((await client.from('blog_draft_evaluations').select('score').eq('draft_id',id).single()).data?.score).toBe(80);
    expect(await claim(id)).toBeNull();
  });
  it('retries failed evaluations while fencing stale writes and preserving the article',async()=>{
    const id=await create();const first=(await claim(id))!;
    await begin(id,'first',first);await fail(id,'api_error','first',first);
    const second=(await claim(id))!;expect(second).not.toBe(first);
    await begin(id,'second',second);
    await fail(id,'timeout','first',first);
    await expect(save(id,'first',evaluation,first)).rejects.toBeTruthy();
    const row=(await client.from('blog_drafts').select('status,evaluation_status,evaluation_workflow_run_id').eq('id',id).single()).data;
    expect(row).toEqual({status:'completed',evaluation_status:'running',evaluation_workflow_run_id:'second'});
    await save(id,'second',evaluation,second);
  });
  it('denies browser roles access to the evaluation transaction and records',async()=>{
    const id=await create();
    const result=await anon.rpc('complete_blog_evaluation',{
      p_draft_id:id,p_run_id:'x',p_attempt_id:crypto.randomUUID(),p_score:0,
      p_criteria:[],p_critical_errors:[],p_recommendations:[],
    });
    expect(result.error).toBeTruthy();
    expect((await anon.from('blog_draft_evaluations').select('*')).error).toBeTruthy();
  });
});
