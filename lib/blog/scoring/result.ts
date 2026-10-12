import { categories, deterministicMaximum, llmMaximum, semanticCodes } from '@/lib/blog/scoring/rubric';
import { deduplicate } from '@/lib/blog/scoring/rules';
import type { Category, DeterministicResult, Evidence, EvidenceSource, Evaluation, Finding, LlmCriterion, LlmEvaluation, ScoringInput } from '@/types/blog-evaluation.types';

export class EvaluationError extends Error {
  constructor(public readonly code: string) { super(code); }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EvaluationError('invalid_evaluation');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new EvaluationError('invalid_evaluation');
  return value.trim();
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new EvaluationError('invalid_evaluation');
  return value;
}
function normalize(value: string) { return value.replace(/\s+/g, ' ').trim(); }

export function parseResult(value: unknown, input: ScoringInput, checks: DeterministicResult): LlmEvaluation {
  const source = { ...input, article: checks.metrics.text };
  const sources: EvidenceSource[] = ['article','instructions','title','seoTitle','metaDescription','primaryKeyword','slug'];
  function evidence(value: unknown): Evidence[] {
    return array(value).map(item => {
      const itemRecord = record(item);
      const field = itemRecord.source as EvidenceSource;
      const quote = text(itemRecord.quote);
      if (!sources.includes(field) || !normalize(source[field]).includes(normalize(quote))) {
        throw new EvaluationError('invalid_evidence');
      }
      return { source: field, quote };
    });
  }
  const body = record(value);
  const criteria: LlmCriterion[] = array(body.criteria).map(item => {
    const itemRecord = record(item);
    const category = itemRecord.category as Category;
    const score = itemRecord.score;
    if (!categories.includes(category) || !Number.isInteger(score) || typeof score !== 'number' ||
      score < 0 || score > llmMaximum[category]) throw new EvaluationError('invalid_evaluation');
    return { category, score, explanation: text(itemRecord.explanation), evidence: evidence(itemRecord.evidence) };
  });
  if (criteria.length !== 5 || new Set(criteria.map(item => item.category)).size !== 5) throw new EvaluationError('invalid_evaluation');
  function findings(value: unknown, critical: boolean): Finding[] {
    const allowed: readonly string[] = critical ? semanticCodes : ['improve_coverage','improve_rigor','improve_structure','improve_metadata','improve_style'];
    return deduplicate(array(value).map(item => {
      const itemRecord = record(item);
      const code = text(itemRecord.code);
      const field = itemRecord.field as EvidenceSource;
      const proof = evidence(itemRecord.evidence);
      if (!allowed.includes(code) || !sources.includes(field) || (critical && proof.length === 0)) {
        throw new EvaluationError('invalid_evaluation');
      }
      return { code, field, explanation: text(itemRecord.explanation), evidence: proof };
    }));
  }
  return { criteria, criticalErrors: findings(body.criticalErrors, true), recommendations: findings(body.recommendations, false) };
}

export function combine(checks: DeterministicResult, llm: LlmEvaluation): Evaluation {
  const criteria = categories.map(category => {
    const item = llm.criteria.find(item => item.category === category)!;
    return {
      category, deterministic: checks.points[category], llm: item.score,
      score: checks.points[category] + item.score,
      maximum: deterministicMaximum[category] + llmMaximum[category],
      explanation: item.explanation, evidence: item.evidence,
    };
  });
  return {
    score: criteria.reduce((total, criterion) => total + criterion.score, 0), criteria,
    criticalErrors: deduplicate([...checks.criticalErrors, ...llm.criticalErrors]),
    recommendations: deduplicate([...checks.observations, ...llm.recommendations]),
    createdAt: new Date().toISOString(),
  };
}
