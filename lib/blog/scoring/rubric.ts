import type { Category, EditorialStatus } from '@/types/blog-evaluation.types';

export const categories: Category[] = ['utility', 'rigor', 'structure', 'metadata', 'clarity'];
export const llmMaximum: Record<Category, number> = { utility: 30, rigor: 25, structure: 10, metadata: 12, clarity: 10 };
export const deterministicMaximum: Record<Category, number> = { utility: 0, rigor: 0, structure: 5, metadata: 8, clarity: 0 };
export const semanticCodes = ['unrelated_title', 'truncated_content', 'missing_essential_topic', 'contradiction', 'unsupported_claim', 'false_attribution'] as const;

export function editorialStatus(score: number, criticalCount: number): EditorialStatus {
  if (criticalCount > 0) return 'requires_corrections';
  return score >= 80 ? 'ready_for_review' : 'needs_improvement';
}
