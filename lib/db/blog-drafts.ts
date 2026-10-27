import { getRun } from '@/lib/db/blog-research';
import { listItem } from '@/lib/blog/draft-list-item';
import type { BlogRegionId, SelectionContext } from '@/types/blog-selection.types';
import { editorialStatus } from '@/lib/blog/scoring/rubric';
import { createAdminClient } from '@/lib/supabase/server';
import type { DraftDetail, DraftDetailRow, DraftPage, DraftSummaryRow } from '@/types/blog-draft-record.types';
import type { GeneratedArticle } from '@/types/blog-article.types';

export const PAGE_SIZE = 50;

export async function deleteDraft(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from('blog_drafts').delete()
    .eq('id', id).in('status', ['completed', 'failed'])
    .in('evaluation_status', ['not_evaluated', 'completed', 'failed'])
    .in('research_status', ['not_started', 'completed', 'partial', 'failed']).select('id').maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function listDrafts(page: number): Promise<DraftPage> {
  const offset = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await createAdminClient()
    .from('blog_drafts')
    .select('id,title,instructions,status,created_at,evaluation_status,research_status,error_code,generation_research:blog_research_runs!blog_drafts_generation_research_run_id_fkey(status,results:blog_research_results(status)),evaluation:blog_draft_evaluations(score,critical_errors)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as DraftSummaryRow[];
  const total = count ?? 0;
  return {
    drafts: rows.map(row => listItem(row)),
    pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
  };
}

export async function getDraft(id: string): Promise<DraftDetail | null> {
  const { data, error } = await createAdminClient()
    .from('blog_drafts')
    .select('id,title,instructions,status,created_at,updated_at,generation_context,generation_research_run_id,article_links,article_references,content_html,primary_keyword,slug,seo_title,meta_description,error_code,evaluation_status,evaluation_error_code,research_status,evaluation:blog_draft_evaluations(score,criteria,critical_errors,recommendations,created_at)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as DraftDetailRow;
  return {
    id: row.id, title: row.title, instructions: row.instructions, status: row.status, generationContext: row.generation_context ?? null,
    generationResearchId:row.generation_research_run_id ?? null,
    research:row.generation_research_run_id ? await getRun(row.generation_research_run_id) : null,
    articleLinks:row.article_links ?? [],articleReferences:row.article_references ?? [],
    createdAt: row.created_at, updatedAt: row.updated_at, contentHtml: row.content_html,
    primaryKeyword: row.primary_keyword, slug: row.slug, seoTitle: row.seo_title,
    metaDescription: row.meta_description, errorCode: row.error_code,
    researchStatus: row.research_status ?? 'not_started', evaluationStatus: row.evaluation_status, evaluationErrorCode: row.evaluation_error_code,
    editorialStatus: row.evaluation_status === 'completed' && row.evaluation ? editorialStatus(row.evaluation.score,row.evaluation.critical_errors.length) : null,
    criticalCount: row.evaluation_status === 'completed' ? row.evaluation?.critical_errors.length ?? 0 : 0,
    evaluation: row.evaluation_status === 'completed' && row.evaluation ? {
      score: row.evaluation.score, criteria: row.evaluation.criteria, criticalErrors: row.evaluation.critical_errors, recommendations: row.evaluation.recommendations, createdAt: row.evaluation.created_at,
    } : null,
  };
}

export async function createDraft(instructions: string, context?: SelectionContext): Promise<DraftDetail> {
  const { data, error } = await createAdminClient().from('blog_drafts')
    .insert({ instructions, ...(context ? {generation_context: context} : {}) }).select('id').single();
  if (error) throw error;
  const draft = await getDraft(data.id);
  if (!draft) throw new Error('Created draft missing');
  return draft;
}

export async function setRunId(id: string, runId: string): Promise<void> {
  const { error } = await createAdminClient().from('blog_drafts')
    .update({ workflow_run_id: runId }).eq('id', id);
  if (error) throw error;
}

export async function markRunning(id: string): Promise<void> {
  const { error } = await createAdminClient().from('blog_drafts')
    .update({ status: 'running', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'queued');
  if (error) throw error;
}

export async function markFailed(id: string, code: string): Promise<void> {
  const {error} = await createAdminClient().rpc('fail_blog_generation',{p_draft_id:id,p_error:code});
  if (error) throw error;
}

export async function completeDraft(id: string, result: GeneratedArticle & {links?:string[];references?:DraftDetail['articleReferences']}): Promise<string> {
  const { article } = result;
  const attemptId = crypto.randomUUID();
  const { data, error } = await createAdminClient().from('blog_drafts').update({
    title: article.title, content_html: result.contentHtml, primary_keyword: article.primaryKeyword,
    slug: article.slug, seo_title: article.seoTitle, meta_description: article.metaDescription,
    article_links:result.links ?? [],article_references:result.references ?? [],
    model: result.model, status: 'completed', error_code: null, evaluation_status: 'queued', evaluation_error_code: null, evaluation_attempt_id: attemptId, updated_at: new Date().toISOString(),
  }).eq('id', id).in('status',['queued','running']).select('evaluation_attempt_id').maybeSingle();
  if (error) throw error;
  if (data) return data.evaluation_attempt_id;
  // A lost response may retry this write after completion; keep the same evaluation claim.
  const previous = await createAdminClient().from('blog_drafts').select('evaluation_attempt_id').eq('id',id).eq('status','completed').maybeSingle();
  if (previous.error) throw previous.error;
  if (!previous.data?.evaluation_attempt_id) throw new Error('Generation state conflict');
  return previous.data.evaluation_attempt_id;
}

export async function createGeneration(regionId:BlogRegionId,events:Array<{id:string;name:string}>,model:string,instructions:string):Promise<DraftDetail> {
  const {data,error} = await createAdminClient().rpc('create_blog_generation',{
    p_region_id:regionId,p_events:events,p_provider:'openai',p_model:model,p_instructions:instructions,
  });
  if (error) throw error;
  try {
    const draft = await getDraft(data as string);
    if (!draft) throw new Error('Created generation missing');
    return draft;
  } catch (error) {
    await markFailed(data as string,'start_failed');
    throw error;
  }
}
