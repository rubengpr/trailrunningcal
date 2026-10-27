import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {ResearchError} from '@/lib/blog/research/result';
import {GenerationError} from '@/lib/blog/content';
import type {WritingInput} from '@/types/blog-writing.types';
const mocks=vi.hoisted(()=>({start:vi.fn(),investigate:vi.fn(),write:vi.fn(),evaluate:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createAdminClient:()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})}));
vi.mock('@/lib/auth',()=>({requireAdmin:vi.fn()}));
vi.mock('workflow',()=>({FatalError:class extends Error{},getWorkflowMetadata:()=>({workflowRunId:'integration-workflow'})}));
vi.mock('workflow/api',()=>({start:mocks.start}));
vi.mock('@/lib/integrations/openai/event-investigation',()=>({researchModel:'test-model',investigateEvent:mocks.investigate}));
vi.mock('@/lib/integrations/openai/article-writing',()=>({writingOptions:{model:'test-model'},writeArticle:mocks.write}));
vi.mock('@/lib/integrations/openai/article-evaluation',()=>({evaluationModel:'test-model',evaluateArticle:mocks.evaluate}));
import {POST} from '@/app/api/blog-drafts/route';
import {GET} from '@/app/api/blog-drafts/[id]/route';
import {articleWorkflow} from '@/lib/workflows/blog-article';
import {getDraft,listDrafts,deleteDraft} from './blog-drafts';
import {getRun} from './blog-research';
import {listEvents} from './blog-events';
const integration=process.env.RUN_SUPABASE_INTEGRATION_TESTS==='true'?describe:describe.skip;
let client:SupabaseClient;
let events:Array<{id:string;name:string}>;
const ids:string[]=[];
let failures=0;
async function create(){
 const response=await POST(new Request('http://localhost/api/blog-drafts',{method:'POST',body:JSON.stringify({regionId:'catalonia',eventIds:events.map(event=>event.id)})}));
 const body=await response.json();
 if(body.data?.id)ids.push(body.data.id);
 expect(response.status).toBe(202);
 expect(Object.keys(body.data).sort()).toEqual(['id','status','stage','progress','takingLong'].sort());
 return body.data.id as string;
}
integration('connected generation with local database and simulated inference',()=>{
 beforeAll(async()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if(new URL(url).hostname!=='wghqldoshvwulyqqbqln.supabase.co')throw new Error('Only trailrunningcal-local');
  client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  events=(await listEvents('catalonia','',1)).events.slice(0,5).map(({id,name})=>({id,name}));
  expect(events).toHaveLength(5);
 });
 beforeEach(()=>{
  vi.clearAllMocks();failures=0;
  mocks.start.mockResolvedValue({runId:'integration-workflow'});
  mocks.investigate.mockImplementation(async({eventName}:{eventName:string})=>{
   if(failures-->0)throw new ResearchError('api_error');
   return {dossier:{context:`${eventName} se celebra en Cataluña. [1]`,sources:[{title:'Mock',url:'https://example.com/event'}],observations:[]},consultedSources:['https://example.com/event'],model:'test-model',responseId:'mock',usage:null,searchCalls:1,durationMs:1};
  });
  mocks.write.mockImplementation(async(input:WritingInput)=>({model:'test-model',usage:null,responseId:'mock',value:{
   title:'Las 5 mejores carreras de trail running en Cataluña',primaryKeyword:'trail running en Cataluña',slug:'mejores-carreras-trail-cataluna',seoTitle:'Cinco eventos de trail running en Cataluña',metaDescription:'Una selección editorial de eventos y modalidades para descubrir Cataluña.',
   contentMarkdown:'Descubre estos eventos y sus modalidades de trail running en Cataluña. Esta selección editorial te ayuda a comparar.\n\n'+input.events.map(event=>`## ${event.eventName}\n\n${event.dossier?`${event.eventName} se celebra en Cataluña.\n\n`:''}`).join('')+'## Cómo elegir\n\nCompara las propuestas antes de decidir.',
   references:input.events.filter(event=>event.dossier).map(event=>({eventName:event.eventName,excerpt:`${event.eventName} se celebra en Cataluña.`,sourceIndexes:[1]})),
  }}));
  // Exercise isolation of a failed evaluator with the real evaluation persistence steps.
  mocks.evaluate.mockRejectedValue(new Error('simulated evaluation failure'));
 });
 afterEach(async()=>{
  for(const id of ids.splice(0)){
   const draft=await getDraft(id);const runId=draft?.generationResearchId;
   const result=await client.from('blog_drafts').delete().eq('id',id);if(result.error)throw result.error;
   if(runId)expect((await client.from('blog_research_results').select('id').eq('run_id',runId)).data).toEqual([]);
  }
 });
 it.each([0,1,4])('persists five identities, research and article with %s missing dossiers',async missing=>{
  failures=missing;const id=await create();const pending=await getDraft(id);
  expect(pending?.generationContext).toBeNull();expect(pending?.research?.results).toHaveLength(5);
  expect(await deleteDraft(id)).toBe(false);
  expect((await GET(new Request('http://localhost'),{params:Promise.resolve({id})})).status).toBe(409);
  const item=(await listDrafts(1)).drafts.find(draft=>draft.id===id)!;expect(item).not.toHaveProperty('title');
  await expect(articleWorkflow({id})).rejects.toThrow('api_error');
  const draft=(await getDraft(id))!;
  expect(draft.status).toBe('completed');expect(draft.evaluationStatus).toBe('failed');
  expect(draft.articleLinks).toHaveLength(6-missing);expect(draft.research?.results.filter(result=>!result.dossier)).toHaveLength(missing);
  expect(draft.articleReferences).toHaveLength(5-missing);
  expect(mocks.investigate).toHaveBeenCalledTimes(5);expect(mocks.write).toHaveBeenCalledTimes(1);expect(mocks.start).toHaveBeenCalledTimes(1);
  for(const [input] of mocks.investigate.mock.calls)expect(Object.keys(input).sort()).toEqual(['eventName','regionName']);
  expect((await GET(new Request('http://localhost'),{params:Promise.resolve({id})})).status).toBe(200);
  const run=await getRun(draft.generationResearchId!);expect(run.status).toBe(missing?'partial':'completed');
 });
 it('rolls back all three tables when selection is invalid',async()=>{
  const counts=async()=>Promise.all(['blog_drafts','blog_research_runs','blog_research_results'].map(async table=>(await client.from(table).select('id',{head:true,count:'exact'})).count));
  const before=await counts();
  const result=await client.rpc('create_blog_generation',{p_region_id:'catalonia',p_events:events.slice(0,4),p_provider:'openai',p_model:'test',p_instructions:'Invalid temporary generation'});
  expect(result.error).toBeTruthy();expect(await counts()).toEqual(before);
 });
 it('stops before writing after five research failures',async()=>{
  failures=5;const id=await create();await expect(articleWorkflow({id})).rejects.toThrow('research_failed');
  expect(mocks.write).not.toHaveBeenCalled();expect(mocks.evaluate).not.toHaveBeenCalled();
  const draft=await getDraft(id);expect(draft?.status).toBe('failed');expect(draft?.researchStatus).toBe('failed');
 });
 it('retains all research when the writer returns invalid content',async()=>{
  const id=await create();mocks.write.mockRejectedValue(new GenerationError('invalid_content'));
  await expect(articleWorkflow({id})).rejects.toThrow('writing_failed');
  const draft=await getDraft(id);expect(draft?.status).toBe('failed');expect(draft?.research?.status).toBe('completed');
  expect(mocks.evaluate).not.toHaveBeenCalled();
 });
 it('releases both queued states if workflow cannot start',async()=>{
  mocks.start.mockRejectedValue(new Error('simulated start failure'));
  const response=await POST(new Request('http://localhost/api/blog-drafts',{method:'POST',body:JSON.stringify({regionId:'catalonia',eventIds:events.map(event=>event.id)})}));
  expect(response.status).toBe(500);
  // Locate only this test's generated instructions, without touching older records.
  const id=mocks.start.mock.calls[0][1][0].id as string;ids.push(id);
  const draft=await getDraft(id);expect(draft?.status).toBe('failed');expect(draft?.researchStatus).toBe('failed');expect(mocks.investigate).not.toHaveBeenCalled();
 });
});
