import OpenAI from 'openai';
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from 'openai/resources/responses/responses';
import { requireApiKey } from '@/lib/integrations/utils';
import { rates, settings } from '@/lib/web-search-benchmark/config';
import { object, sanitize } from '@/lib/web-search-benchmark/utils';
import type { RecordEvent } from '@/types/web-search-benchmark.types';

export type Complete = (
  params: ResponseCreateParamsNonStreaming,
  signal: AbortSignal,
) => Promise<Response>;
export function createClient(record: RecordEvent): Complete {
  const client = new OpenAI({
    apiKey: requireApiKey('OPENAI_API_KEY'),
    timeout: settings.timeoutMs,
    maxRetries: 0,
  });
  return async (params, signal) => {
    const startedAt = new Date().toISOString();
    const start = Date.now();
    let response: Response;
    try {
      response = await client.responses.create(params, {
        signal,
        timeout: settings.timeoutMs,
        maxRetries: 0,
      });
    } catch (failure) {
      const details = object(failure);
      await record({
        type: 'llm',
        input: params,
        raw: sanitize({
          status: details.status,
          code: details.code,
          type: details.type,
          requestId: details.request_id,
          body: details.error ?? null,
        }),
        charge: {
          usd: null,
          basis: 'unknown',
          missing: 'Usage unavailable for failed LLM request',
        },
        startedAt,
        durationMs: Date.now() - start,
        error: signal.aborted
          ? 'LLM timeout or cancellation'
          : 'LLM request failed',
      });
      throw new Error('LLM request failed');
    }
    const usage = response.usage;
    const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
    const input = usage?.input_tokens ?? 0;
    const output = usage?.output_tokens ?? 0;
    const long = input > 272_000;
    const usd = usage
      ? ((input - cached) *
          (long ? rates.longInputPerMillion : rates.inputPerMillion) +
          cached *
            (long ? rates.longCachedPerMillion : rates.cachedPerMillion) +
          output *
            (long ? rates.longOutputPerMillion : rates.outputPerMillion)) /
        1e6
      : null;
    await record({
      type: 'llm',
      input: params,
      raw: response,
      charge: { usd, basis: usage ? 'published-rate' : 'unknown' },
      startedAt,
      durationMs: Date.now() - start,
      usage: { inputTokens: input, cachedTokens: cached, outputTokens: output },
    });
    return response;
  };
}
