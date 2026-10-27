import type { InferenceCall } from '@/types/blog-cost.types';

function field(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

// Without a response the SDK exposes no consumption, so usage stays unknown.
export function captureCall(requestedModel: string, response?: unknown): InferenceCall {
  const output = field(response, 'output');
  const searchCalls = Array.isArray(output)
    ? output.filter(item => field(item, 'type') === 'web_search_call' && field(item, 'status') === 'completed' && field(field(item, 'action'), 'type') === 'search').length
    : null;
  return {
    requestedModel,
    model: text(field(response, 'model')),
    serviceTier: text(field(response, 'service_tier')),
    responseId: text(field(response, 'id')),
    responseStatus: text(field(response, 'status')),
    usage: field(response, 'usage') ?? null,
    searchCalls,
  };
}
