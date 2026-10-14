import type { SelectionContext } from '@/types/blog-selection.types';
export type EvaluationStatus = 'not_evaluated' | 'queued' | 'running' | 'completed' | 'failed';
export type EditorialStatus = 'requires_corrections' | 'needs_improvement' | 'ready_for_review';
export type Category = 'utility' | 'rigor' | 'structure' | 'metadata' | 'clarity';
export type EvidenceSource = 'article' | 'instructions' | 'title' | 'seoTitle' | 'metaDescription' | 'primaryKeyword' | 'slug';
export interface Evidence { source: EvidenceSource; quote: string }
export interface Finding {
  code: string;
  field: EvidenceSource;
  explanation: string;
  evidence: Evidence[];
}
export interface Criterion {
  category: Category;
  deterministic: number;
  llm: number;
  score: number;
  maximum: number;
  explanation: string;
  evidence: Evidence[];
}
export interface Evaluation {
  score: number;
  criteria: Criterion[];
  criticalErrors: Finding[];
  recommendations: Finding[];
  createdAt: string;
}
export interface ScoringInput {
  generationContext?: SelectionContext | null;
  instructions: string;
  title: string;
  contentHtml: string;
  primaryKeyword: string;
  slug: string;
  seoTitle: string;
  metaDescription: string;
}
export interface Metrics {
  text: string;
  headings: { level: number; text: string }[];
  words: number;
  lengths: Record<'title' | 'seoTitle' | 'metaDescription' | 'slug', number>;
  keywordPresent: boolean;
}
export interface DeterministicResult {
  points: Record<Category, number>;
  criticalErrors: Finding[];
  observations: Finding[];
  metrics: Metrics;
}
export interface LlmCriterion {
  category: Category;
  score: number;
  explanation: string;
  evidence: Evidence[];
}
export interface LlmEvaluation {
  criteria: LlmCriterion[];
  criticalErrors: Finding[];
  recommendations: Finding[];
}
