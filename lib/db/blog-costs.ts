import { summarize } from '@/lib/blog/costs';
import { createAdminClient } from '@/lib/supabase/server';
import type { CallStatus, CostEntry, CostEstimate, CostRow, CostSummary, CostUnavailable } from '@/types/blog-cost.types';
import type { DraftDetail } from '@/types/blog-draft-record.types';

// Replays of the same call keep the first record: neither the row nor its cost is duplicated.
export async function record(entry: CostEntry, status: CallStatus, cost: CostEstimate | CostUnavailable): Promise<void> {
  const estimate = typeof cost === 'string' ? null : cost;
  const {error} = await createAdminClient().from('blog_inference_costs').upsert({
    call_key: entry.key, stage: entry.stage, draft_id: entry.draftId, research_result_id: entry.researchResultId,
    evaluation_attempt_id: entry.evaluationAttemptId, status, error_code: entry.errorCode,
    requested_model: entry.call.requestedModel, model: entry.call.model, service_tier: entry.call.serviceTier,
    response_id: entry.call.responseId, usage: entry.call.usage ?? null, search_calls: entry.call.searchCalls,
    rates: estimate?.rates ?? null, tokens: estimate?.tokens ?? null, breakdown: estimate?.breakdown ?? null,
    cost_usd: estimate?.costUsd ?? null, unavailable_reason: typeof cost === 'string' ? cost : null,
  }, {onConflict: 'call_key', ignoreDuplicates: true});
  if (error) throw error;
}

async function listCosts(draftId: string, resultIds: string[]): Promise<CostRow[]> {
  const filter = resultIds.length ? `draft_id.eq.${draftId},research_result_id.in.(${resultIds.join(',')})` : `draft_id.eq.${draftId}`;
  const {data, error} = await createAdminClient().from('blog_inference_costs')
    .select('id,call_key,stage,research_result_id,status,requested_model,model,tokens,search_calls,cost_usd,created_at')
    .or(filter).order('created_at').order('id');
  if (error) throw error;
  return (data ?? []) as CostRow[];
}

export async function getCosts(draft: DraftDetail): Promise<CostSummary> {
  return summarize(draft, await listCosts(draft.id, draft.research?.results.map(result => result.id) ?? []));
}
