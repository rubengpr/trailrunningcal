import type { EditorialStatus, Evaluation, EvaluationStatus } from '@/types/blog-evaluation.types';

export type DraftStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface DraftSummary {
  id: string;
  title: string | null;
  instructions: string;
  status: DraftStatus;
  createdAt: string;
  score: number | null;
  evaluationStatus: EvaluationStatus;
  editorialStatus: EditorialStatus | null;
  criticalCount: number;
}

export type DraftEvaluation = Evaluation;

export interface DraftDetail extends Omit<DraftSummary, 'score'> {
  contentHtml: string | null;
  primaryKeyword: string | null;
  slug: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  updatedAt: string;
  errorCode: string | null;
  evaluation: DraftEvaluation | null;
  evaluationErrorCode: string | null;
}

export interface DraftPage {
  drafts: DraftSummary[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface DraftInput {
  instructions: string;
}

export interface DraftSummaryRow {
  id: string;
  title: string | null;
  instructions: string;
  status: DraftStatus;
  created_at: string;
  evaluation_status: EvaluationStatus;
  evaluation: { score: number; critical_errors: Evaluation['criticalErrors'] } | null;
}

export interface DraftDetailRow extends Omit<DraftSummaryRow, 'evaluation'> {
  content_html: string | null;
  primary_keyword: string | null;
  slug: string | null;
  seo_title: string | null;
  meta_description: string | null;
  updated_at: string;
  error_code: string | null;
  evaluation_error_code: string | null;
  evaluation: { score: number; criteria: DraftEvaluation['criteria']; critical_errors: Evaluation['criticalErrors']; recommendations: Evaluation['recommendations']; created_at: string } | null;
}
