import { editorialStatus } from '@/lib/blog/scoring/rubric';
import { createAdminClient } from '@/lib/supabase/server';
import type { DraftDetail, DraftDetailRow, DraftPage, DraftSummaryRow } from '@/types/blog-draft-record.types';
import type { GeneratedArticle } from '@/types/blog-article.types';

export const PAGE_SIZE = 50;

export async function deleteDraft(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from('blog_drafts').delete()
    .eq('id', id).in('status', ['completed', 'failed'])
    .in('evaluation_status', ['not_evaluated', 'completed', 'failed']).select('id').maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function listDrafts(page: number): Promise<DraftPage> {
  const offset = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await createAdminClient()
    .from('blog_drafts')
    .select('id,title,instructions,status,created_at,evaluation_status,evaluation:blog_draft_evaluations(score,critical_errors)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as DraftSummaryRow[];
  const total = count ?? 0;
  return {
    drafts: rows.map(row => ({
      id: row.id, title: row.title, instructions: row.instructions,
      status: row.status, createdAt: row.created_at, score: row.evaluation_status === 'completed' ? row.evaluation?.score ?? null : null,
      evaluationStatus: row.evaluation_status,
      editorialStatus: row.evaluation_status === 'completed' && row.evaluation ? editorialStatus(row.evaluation.score,row.evaluation.critical_errors.length) : null,
      criticalCount: row.evaluation_status === 'completed' ? row.evaluation?.critical_errors.length ?? 0 : 0,
    })),
    pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
  };
}

export async function getDraft(id: string): Promise<DraftDetail | null> {
  const { data, error } = await createAdminClient()
    .from('blog_drafts')
    .select('id,title,instructions,status,created_at,updated_at,content_html,primary_keyword,slug,seo_title,meta_description,error_code,evaluation_status,evaluation_error_code,evaluation:blog_draft_evaluations(score,criteria,critical_errors,recommendations,created_at)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as DraftDetailRow;
  return {
    id: row.id, title: row.title, instructions: row.instructions, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at, contentHtml: row.content_html,
    primaryKeyword: row.primary_keyword, slug: row.slug, seoTitle: row.seo_title,
    metaDescription: row.meta_description, errorCode: row.error_code,
    evaluationStatus: row.evaluation_status, evaluationErrorCode: row.evaluation_error_code,
    editorialStatus: row.evaluation_status === 'completed' && row.evaluation ? editorialStatus(row.evaluation.score,row.evaluation.critical_errors.length) : null,
    criticalCount: row.evaluation_status === 'completed' ? row.evaluation?.critical_errors.length ?? 0 : 0,
    evaluation: row.evaluation_status === 'completed' && row.evaluation ? {
      score: row.evaluation.score, criteria: row.evaluation.criteria, criticalErrors: row.evaluation.critical_errors, recommendations: row.evaluation.recommendations, createdAt: row.evaluation.created_at,
    } : null,
  };
}

export async function createDraft(instructions: string): Promise<DraftDetail> {
  const { data, error } = await createAdminClient().from('blog_drafts')
    .insert({ instructions }).select('id').single();
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
  const { error } = await createAdminClient().from('blog_drafts')
    .update({ status: 'failed', error_code: code, updated_at: new Date().toISOString() })
    .eq('id', id).neq('status', 'completed');
  if (error) throw error;
}

export async function completeDraft(id: string, result: GeneratedArticle): Promise<string> {
  const { article } = result;
  const attemptId = crypto.randomUUID();
  const { error } = await createAdminClient().from('blog_drafts').update({
    title: article.title, content_html: result.contentHtml, primary_keyword: article.primaryKeyword,
    slug: article.slug, seo_title: article.seoTitle, meta_description: article.metaDescription,
    model: result.model, status: 'completed', error_code: null, evaluation_status: 'queued', evaluation_error_code: null, evaluation_attempt_id: attemptId, updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
  return attemptId;
}
