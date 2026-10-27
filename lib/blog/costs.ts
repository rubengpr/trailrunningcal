import type { CostGroup, CostLine, CostRow, CostStage, CostSummary } from '@/types/blog-cost.types';
import type { DraftDetail } from '@/types/blog-draft-record.types';

const stages: CostStage[] = ['research', 'writing', 'evaluation'];
// These failures happen before any model request, so no consumption is missing.
const preInferenceFailures = ['start_failed', 'workflow_error'];

function sum(lines: CostLine[]): {costUsd: number | null; partial: boolean} {
  const known = lines.filter(line => line.costUsd !== null);
  return {
    costUsd: known.length ? Math.round(known.reduce((total, line) => total + (line.costUsd ?? 0), 0) * 1e8) / 1e8 : null,
    partial: known.length < lines.length,
  };
}

function unknown(id: string, stage: CostStage, eventName: string | null, attempt: number | null): CostLine {
  return {id, stage, eventName, attempt, model: null, status: null, tokens: null, searches: null, costUsd: null};
}

// Drafts and investigations from before cost tracking have no rows: their cost is unknown, never zero.
export function summarize(draft: Pick<DraftDetail, 'id' | 'status' | 'research' | 'evaluationStatus' | 'evaluationErrorCode'>, rows: CostRow[]): CostSummary {
  const events = new Map(draft.research?.results.map(result => [result.id, result]) ?? []);
  const line = (row: CostRow, attempt: number | null): CostLine => ({
    id: row.id, stage: row.stage, eventName: row.research_result_id ? events.get(row.research_result_id)?.eventName ?? null : null,
    attempt, model: row.model ?? row.requested_model, status: row.status, tokens: row.tokens,
    searches: row.search_calls, costUsd: row.cost_usd === null ? null : Number(row.cost_usd),
  });
  const research = rows.filter(row => row.stage === 'research').map(row => line(row, null));
  for (const result of events.values()) {
    if ((result.status === 'completed' || result.status === 'failed') && !rows.some(row => row.research_result_id === result.id)) {
      research.push(unknown(`research:${result.id}`, 'research', result.eventName, null));
    }
  }
  research.sort((a, b) => (a.eventName ?? '').localeCompare(b.eventName ?? '', 'es'));
  const writing = rows.filter(row => row.stage === 'writing').map(row => line(row, null));
  if (!writing.length && draft.status === 'completed') writing.push(unknown(`writing:${draft.id}`, 'writing', null, null));
  const evaluation = rows.filter(row => row.stage === 'evaluation').map((row, index) => line(row, index + 1));
  if (!evaluation.length && (draft.evaluationStatus === 'completed' || (draft.evaluationStatus === 'failed' && !preInferenceFailures.includes(draft.evaluationErrorCode ?? '')))) {
    evaluation.push(unknown(`evaluation:${draft.id}`, 'evaluation', null, 1));
  }
  const lines = {research, writing, evaluation};
  const groups: CostGroup[] = stages.map(stage => ({stage, ...sum(lines[stage]), lines: lines[stage]}));
  return {...sum(groups.flatMap(group => group.lines)), groups};
}
