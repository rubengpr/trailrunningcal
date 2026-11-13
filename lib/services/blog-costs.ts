import { record } from '@/lib/db/blog-costs';
import { estimate } from '@/lib/integrations/openai/pricing';
import { captureCall } from '@/lib/integrations/openai/usage';
import { researchModel } from '@/lib/integrations/openai/event-investigation';
import { editingOptions } from '@/lib/integrations/openai/article-editing';
import { writingOptions } from '@/lib/integrations/openai/article-writing';
import { evaluationModel } from '@/lib/integrations/openai/article-evaluation';
import { generationModel } from '@/lib/integrations/openai/article-generation';
import type { CallStatus, CostEntry, InferenceCall, ResponseObserver } from '@/types/blog-cost.types';

type CallKind = 'research' | 'writing' | 'editing' | 'generation' | 'evaluation';
function requestedModel(kind: CallKind): string {
  switch (kind) {
    case 'research': return researchModel;
    case 'writing': return writingOptions.model;
    case 'editing': return editingOptions.model;
    case 'generation': return generationModel;
    case 'evaluation': return evaluationModel;
  }
}

function requestFailed(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  return code === 'timeout' || code === 'api_error';
}

// Captures the provider response before any validation can discard it.
export function tracker(kind: CallKind): {observe: ResponseObserver; call: (error?: unknown) => InferenceCall | null} {
  let observed: InferenceCall | null = null;
  return {
    observe: async response => { observed = captureCall(requestedModel(kind), response); },
    // A request that failed without a response may still have consumed tokens: record it with unknown usage.
    // Failures before the request (invalid context) are not inference attempts.
    call: error => observed ?? (error === undefined || requestFailed(error) ? captureCall(requestedModel(kind)) : null),
  };
}

export function callStatus(entry: Pick<CostEntry, 'errorCode' | 'call'>): CallStatus {
  if (entry.errorCode === null) return 'succeeded';
  return entry.call.responseStatus === 'incomplete' ? 'incomplete' : 'failed';
}

// Rates are resolved once, at record time, so historical estimates never move.
export async function recordCall(entry: CostEntry): Promise<void> {
  await record(entry, callStatus(entry), estimate(entry.call));
}
