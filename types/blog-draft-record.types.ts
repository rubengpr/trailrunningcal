import type { ResearchRun, DraftResearchStatus } from '@/types/blog-research.types';
import type { SelectionContext, SelectionInput } from '@/types/blog-selection.types';
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
  researchStatus?: DraftResearchStatus;
}

export type DraftListItem =
  | (DraftSummary & {status: 'completed'})
  | ({[S in 'queued'|'running']:{id:string; status:S; stage:'queued'|'researching'|'writing'; progress:{finished:number;total:number}|null; takingLong:boolean}}['queued'|'running'])
  | {id:string; status:'failed'; errorCode:string|null};

export type DraftEvaluation = Evaluation;

export interface DraftDetail extends Omit<DraftSummary, 'score'> {
  generationContext?: SelectionContext | null;
  generationResearchId?: string | null;
  research?: ResearchRun | null;
  articleLinks?: string[];
  articleReferences?: import('@/types/blog-writing.types').WritingResult['references'];
  contentHtml: string | null;
  primaryKeyword: string | null;
  slug: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  updatedAt: string;
  errorCode: string | null;
  evaluation: DraftEvaluation | null;
  evaluationErrorCode: string | null;
  costs?: import('@/types/blog-cost.types').CostSummary | null;
}

export interface DraftPage {
  drafts: DraftListItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export type DraftInput = { instructions: string } | SelectionInput;

export interface DraftSummaryRow {
  id: string;
  title: string | null;
  instructions: string;
  status: DraftStatus;
  created_at: string;
  evaluation_status: EvaluationStatus;
  error_code?: string | null;
  generation_research?: {status:ResearchRun['status'];results:Array<{status:string}>}|null;
  research_status?: DraftResearchStatus;
  evaluation: { score: number; critical_errors: Evaluation['criticalErrors'] } | null;
}

export interface DraftDetailRow extends Omit<DraftSummaryRow, 'evaluation'> {
  generation_context?: SelectionContext | null;
  generation_research_run_id?: string | null;
  article_links?: string[];
  article_references?: import('@/types/blog-writing.types').WritingResult['references'];
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
