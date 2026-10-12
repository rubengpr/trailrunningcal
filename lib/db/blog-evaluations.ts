import { createAdminClient } from '@/lib/supabase/server';
import type { Evaluation } from '@/types/blog-evaluation.types';

export async function claim(id: string): Promise<string|null> {
  const {data,error} = await createAdminClient().from('blog_drafts').update({
    evaluation_attempt_id:crypto.randomUUID(),evaluation_status:'queued',evaluation_error_code:null,evaluation_workflow_run_id:null,updated_at:new Date().toISOString(),
  }).eq('id',id).eq('status','completed').in('evaluation_status',['not_evaluated','failed']).select('evaluation_attempt_id').maybeSingle();
  if (error) throw error;
  return data?.evaluation_attempt_id ?? null;
}

export async function begin(id: string, runId: string, attemptId:string): Promise<void> {
  const client = createAdminClient();
  const {data,error} = await client.from('blog_drafts').update({
    evaluation_status:'running',evaluation_workflow_run_id:runId,evaluation_error_code:null,updated_at:new Date().toISOString(),
  }).eq('id',id).eq('status','completed').eq('evaluation_status','queued').eq('evaluation_attempt_id',attemptId).select('id').maybeSingle();
  if (error) throw error;
  if (data) return;
  const previous = await client.from('blog_drafts').select('id').eq('id',id)
    .eq('evaluation_status','running').eq('evaluation_attempt_id',attemptId).eq('evaluation_workflow_run_id',runId).maybeSingle();
  if (previous.error) throw previous.error;
  if (!previous.data) throw new Error('Evaluation state conflict');
}

export async function fail(id:string,code:string,runId:string|null,attemptId:string):Promise<void> {
  const {error} = await createAdminClient().from('blog_drafts').update({
    evaluation_status:'failed',evaluation_error_code:code,evaluation_workflow_run_id:runId,updated_at:new Date().toISOString(),
  }).eq('id',id).eq('evaluation_attempt_id',attemptId).in('evaluation_status',['queued','running']);
  if (error) throw error;
}

export async function save(id: string, runId: string, result: Evaluation, attemptId:string): Promise<void> {
  const {error} = await createAdminClient().rpc('complete_blog_evaluation',{
    p_draft_id:id,p_run_id:runId,p_attempt_id:attemptId,p_score:result.score,p_criteria:result.criteria,
    p_critical_errors:result.criticalErrors,p_recommendations:result.recommendations,
  });
  if (error) throw error;
}
