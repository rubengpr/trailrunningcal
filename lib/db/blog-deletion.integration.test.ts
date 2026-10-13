import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
vi.mock('@/lib/supabase/server',()=>({createAdminClient:()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})}));
import { deleteDraft } from './blog-drafts';
import { claim } from './blog-evaluations';
const integration=process.env.RUN_SUPABASE_INTEGRATION_TESTS==='true'?describe:describe.skip;
let client:SupabaseClient;const ids:string[]=[];
async function create() {
  const {data,error}=await client.from('blog_drafts').insert({instructions:'Registro temporal descartable para probar eliminación',status:'completed',title:'Borrador temporal para eliminar',content_html:'<h2>Prueba</h2><p>Texto.</p>',primary_keyword:'prueba temporal',slug:'prueba-temporal',seo_title:'Prueba',meta_description:'Registro temporal.'}).select('id').single();
  if(error)throw error;ids.push(data.id);return data.id as string;
}
integration('local blog deletion',()=>{
  beforeAll(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;if(!url||new URL(url).hostname!=='wghqldoshvwulyqqbqln.supabase.co')throw new Error('Only trailrunningcal-local is allowed');client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});});
  afterEach(async()=>{if(ids.length){const {error}=await client.from('blog_drafts').delete().in('id',ids.splice(0));if(error)throw error;}});
  it('deletes the draft and associated report together',async()=>{
    const id=await create();
    const {error}=await client.from('blog_draft_evaluations').insert({draft_id:id,score:80,criteria:[]});if(error)throw error;
    expect(await deleteDraft(id)).toBe(true);
    expect((await client.from('blog_drafts').select('id').eq('id',id)).data).toEqual([]);
    expect((await client.from('blog_draft_evaluations').select('draft_id').eq('draft_id',id)).data).toEqual([]);
    expect(await deleteDraft(id)).toBe(false);
  });
  it('blocks both active lifecycle states and allows a failed article',async()=>{
    const id=await create();
    for(const [status,evaluation_status]of[['queued','not_evaluated'],['running','not_evaluated'],['completed','queued'],['completed','running']]) {
      const {error}=await client.from('blog_drafts').update({status,evaluation_status}).eq('id',id);if(error)throw error;
      expect(await deleteDraft(id)).toBe(false);
    }
    const {error}=await client.from('blog_drafts').update({status:'failed',error_code:'api_error',evaluation_status:'not_evaluated'}).eq('id',id);if(error)throw error;
    expect(await deleteDraft(id)).toBe(true);
  });
  it('cannot both claim an evaluation and delete its article concurrently',async()=>{
    const id=await create();const [deleted,attempt]=await Promise.all([deleteDraft(id),claim(id)]);
    expect(Number(deleted)+Number(attempt!==null)).toBe(1);
    const {data,error}=await client.from('blog_drafts').select('evaluation_status').eq('id',id).maybeSingle();if(error)throw error;
    if(deleted)expect(data).toBeNull();else expect(data?.evaluation_status).toBe('queued');
  });
});
