import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
vi.mock('@/lib/supabase/server',()=>({createAdminClient:()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})}));
import {recordCall} from '@/lib/services/blog-costs';
import {getCosts} from './blog-costs';
import {getDraft} from './blog-drafts';
import type {CostEntry, InferenceCall} from '@/types/blog-cost.types';

const integration=process.env.RUN_SUPABASE_INTEGRATION_TESTS==='true'?describe:describe.skip;
const usage={input_tokens:65264,output_tokens:2391,total_tokens:67655,input_tokens_details:{cached_tokens:5284,cache_write_tokens:28},output_tokens_details:{reasoning_tokens:814}};
const call=(overrides:Partial<InferenceCall>={}):InferenceCall=>({requestedModel:'gpt-6.1-sol',model:'gpt-6.1-sol',serviceTier:'default',responseId:'temporary-test',responseStatus:'completed',usage,searchCalls:0,...overrides});
let client:SupabaseClient;
let draftId:string;
let runId:string;
let resultId:string;

integration('blog inference costs on trailrunningcal-local',()=>{
  beforeAll(async()=>{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if(new URL(url).hostname!=='wghqldoshvwulyqqbqln.supabase.co')throw new Error('Only trailrunningcal-local');
    client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
    const run=await client.from('blog_research_runs').insert({region_id:'catalonia',provider:'openai',model:'gpt-6.1-sol',status:'completed'}).select('id').single();
    if(run.error)throw run.error;
    runId=run.data.id;
    const result=await client.from('blog_research_results').insert({run_id:runId,event_id:crypto.randomUUID(),event_name:'Evento temporal de costes',status:'failed',error_code:'incomplete'}).select('id').single();
    if(result.error)throw result.error;
    resultId=result.data.id;
    const draft=await client.from('blog_drafts').insert({instructions:'Borrador temporal para costes',generation_research_run_id:runId}).select('id').single();
    if(draft.error)throw draft.error;
    draftId=draft.data.id;
    await client.from('blog_research_runs').update({draft_id:draftId}).eq('id',runId);
  });
  afterAll(async()=>{
    if(draftId)await client.from('blog_drafts').delete().eq('id',draftId);
    if(runId)await client.from('blog_research_runs').delete().eq('id',runId);
    const left=await client.from('blog_inference_costs').select('id').or(`draft_id.eq.${draftId},research_result_id.eq.${resultId}`);
    expect(left.data).toEqual([]);
  });
  it('keeps the first record when a durable step replays the write',async()=>{
    const entry:CostEntry={key:`writing:${draftId}`,stage:'writing',draftId,researchResultId:null,evaluationAttemptId:null,errorCode:null,call:call()};
    await recordCall(entry);
    await recordCall({...entry,call:call({usage:{...usage,output_tokens:9999}})});
    const rows=await client.from('blog_inference_costs').select('cost_usd,usage,rates,tokens').eq('call_key',entry.key);
    expect(rows.data).toHaveLength(1);
    expect(Number(rows.data![0].cost_usd)).toBe(0.1444124);
    expect(rows.data![0].usage).toEqual(usage);
    expect(rows.data![0].rates).toMatchObject({version:'2026-10-21',model:'gpt-6.1-sol',tier:'standard'});
  });
  it('stores failed calls and every evaluation attempt, with unknown usage as unknown',async()=>{
    await recordCall({key:`research:${resultId}`,stage:'research',draftId:null,researchResultId:resultId,evaluationAttemptId:null,errorCode:'incomplete',call:call({responseStatus:'incomplete',searchCalls:3})});
    await recordCall({key:`evaluation:${draftId}:a`,stage:'evaluation',draftId,researchResultId:null,evaluationAttemptId:crypto.randomUUID(),errorCode:'timeout',call:call({model:null,serviceTier:null,responseId:null,responseStatus:null,usage:null,searchCalls:null})});
    await recordCall({key:`evaluation:${draftId}:b`,stage:'evaluation',draftId,researchResultId:null,evaluationAttemptId:crypto.randomUUID(),errorCode:null,call:call()});
    const draft=await getDraft(draftId);
    const costs=await getCosts(draft!);
    const [research,writing,evaluation]=costs.groups;
    expect(research.lines).toMatchObject([{eventName:'Evento temporal de costes',status:'incomplete',searches:3,costUsd:0.1744124}]);
    expect(writing.costUsd).toBe(0.1444124);
    expect(evaluation.lines.map(line=>[line.attempt,line.status,line.costUsd])).toEqual([[1,'failed',null],[2,'succeeded',0.1444124]]);
    expect(costs).toMatchObject({costUsd:0.4632372,partial:true});
  });
  it('rejects inconsistent rows and browser roles',async()=>{
    const invalid=await client.from('blog_inference_costs').insert({call_key:`invalid:${draftId}`,stage:'writing',draft_id:draftId,status:'succeeded',requested_model:'m',cost_usd:1});
    expect(invalid.error?.code).toBe('23514');
    const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
    const read=await anon.from('blog_inference_costs').select('id').limit(1);
    expect(read.error).not.toBeNull();
  });
});
