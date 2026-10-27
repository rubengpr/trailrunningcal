import { editorialStatus } from '@/lib/blog/scoring/rubric';
import type { DraftListItem, DraftSummaryRow } from '@/types/blog-draft-record.types';

// This boundary intentionally removes article data until generation is complete.
export function listItem(row:DraftSummaryRow):DraftListItem {
  if (row.status === 'failed') return {id:row.id,status:'failed',errorCode:row.error_code ?? null};
  if (row.status !== 'completed') {
    const run = row.generation_research;
    const researching = row.status === 'running' && run && ['queued','running'].includes(run.status);
    return {id:row.id,status:row.status,stage:row.status === 'queued' ? 'queued' : researching ? 'researching' : 'writing',
      progress:researching ? {finished:run.results.filter(result => ['completed','failed'].includes(result.status)).length,total:run.results.length} : null,
      takingLong:Date.now()-Date.parse(row.created_at)>=30_000};
  }
  const evaluation = row.evaluation_status === 'completed' ? row.evaluation : null;
  return {id:row.id,status:'completed',title:row.title,instructions:row.instructions,createdAt:row.created_at,
    researchStatus:row.research_status ?? 'not_started',evaluationStatus:row.evaluation_status,
    score:evaluation?.score ?? null,criticalCount:evaluation?.critical_errors.length ?? 0,
    editorialStatus:evaluation ? editorialStatus(evaluation.score,evaluation.critical_errors.length) : null};
}
