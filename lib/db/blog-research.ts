import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type { ResearchOutput, ResearchMetadata, ResearchPage, ResearchRun, ResearchResult } from '@/types/blog-research.types';

interface ResultRow {
  id: string; event_id: string; event_name: string; position: number; status: ResearchResult['status'];
  dossier: ResearchResult['dossier']; consulted_sources: string[]; error_code: string | null;
  started_at: string | null; finished_at: string | null;
}
interface RunRow {
  id: string; draft_id: string; input: ResearchRun['input']; provider: string; model: string;
  status: ResearchRun['status']; created_at: string; finished_at: string | null; error_code: string | null;
  results: ResultRow[];
}
const columns = 'id,draft_id,input,provider,model,status,created_at,finished_at,error_code,results:blog_research_results(id,event_id,event_name,position,status,dossier,consulted_sources,error_code,started_at,finished_at)';
function mapRun(row: RunRow): ResearchRun {
  return {
    id: row.id, draftId: row.draft_id, input: row.input, provider: row.provider, model: row.model,
    status: row.status, createdAt: row.created_at, finishedAt: row.finished_at, errorCode: row.error_code,
    results: row.results.map(result => ({id: result.id, eventId: result.event_id, eventName: result.event_name,
      position: result.position, status: result.status, dossier: result.dossier,
      consultedSources: result.consulted_sources, errorCode: result.error_code,
      startedAt: result.started_at, finishedAt: result.finished_at})).sort((a,b) => a.position-b.position),
  };
}
export async function listRuns(draftId: string, page: number): Promise<ResearchPage> {
  const pageSize = 50;
  const {data, count, error} = await createAdminClient().from('blog_research_runs').select(columns, {count:'exact'})
    .eq('draft_id', draftId).order('created_at', {ascending:false}).order('id', {ascending:false})
    .range((page-1)*pageSize, page*pageSize-1);
  if (error) throw error;
  const total = count ?? 0;
  return {runs: ((data ?? []) as unknown as RunRow[]).map(mapRun), pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)}};
}
export async function getRun(id: string): Promise<ResearchRun> {
  const {data,error} = await createAdminClient().from('blog_research_runs').select(columns).eq('id',id).single();
  if (error) throw error;
  return mapRun(data as unknown as RunRow);
}
export async function claim(draftId: string, eventIds: string[], provider: string, model: string): Promise<string> {
  const {data,error} = await createAdminClient().rpc('claim_blog_research', {p_draft_id:draftId,p_event_ids:eventIds,p_provider:provider,p_model:model});
  if (error) {
    if (error.code === 'P0002') throw new ValidationError('Blog draft not found',404);
    if (error.code === 'P0001') throw new ValidationError('Research state conflict',409);
    if (error.code === '22023') throw new ValidationError('Invalid research selection',422);
    throw error;
  }
  return data as string;
}
export async function track(id: string, workflowId: string): Promise<void> {
  const {error} = await createAdminClient().from('blog_research_runs').update({workflow_run_id:workflowId}).eq('id',id);
  if (error) throw error;
}
export async function begin(runId: string, resultId: string, workflowId: string): Promise<void> {
  const {error} = await createAdminClient().rpc('begin_blog_research',{p_run_id:runId,p_result_id:resultId,p_workflow_id:workflowId});
  if (error) throw error;
}
export async function finish(runId: string, resultId: string, output: ResearchOutput | null, code: string | null, metadata?: ResearchMetadata): Promise<void> {
  const {error} = await createAdminClient().rpc('finish_blog_research',{
    p_run_id:runId,p_result_id:resultId,p_dossier:output?.dossier ?? null,p_error:code,
    p_metadata: output ?? metadata ?? {},
  });
  if (error) throw error;
}
export async function fail(runId: string, code: string): Promise<void> {
  const {error} = await createAdminClient().rpc('fail_blog_research',{p_run_id:runId,p_error:code});
  if (error) throw error;
}
