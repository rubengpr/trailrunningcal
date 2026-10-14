import { requireApiKey } from '@/lib/integrations/utils';
import { settings } from '@/lib/web-search-benchmark/config';
import { object, sanitize } from '@/lib/web-search-benchmark/utils';
import type {
  Charge,
  RecordEvent,
  ToolResult,
} from '@/types/web-search-benchmark.types';

export function createHttp(record: RecordEvent, fetcher: typeof fetch = fetch) {
  return async (
    request: {
      endpoint: string;
      key: string;
      header?: string;
      body: Record<string, unknown>;
      type: 'search' | 'read_page';
    },
    signal: AbortSignal,
    decode: (raw: unknown, status: number) => ToolResult,
  ): Promise<ToolResult> => {
    const key = requireApiKey(request.key);
    const startedAt = new Date().toISOString();
    const start = Date.now();
    let raw: unknown = null;
    let charge: Charge = {
      usd: null,
      basis: 'unknown',
      missing: 'Provider cost unavailable after request failure',
    };
    try {
      const response = await fetcher(request.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [request.header ?? 'Authorization']: request.header
            ? key
            : `Bearer ${key}`,
        },
        body: JSON.stringify(request.body),
        signal: AbortSignal.any([
          signal,
          AbortSignal.timeout(settings.timeoutMs),
        ]),
      });
      const body = await response.text();
      try {
        raw = JSON.parse(body);
      } catch {
        raw = { body };
      }
      const result = decode(raw, response.status);
      charge = result.charge;
      if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
      await record({
        type: request.type,
        input: { endpoint: request.endpoint, body: request.body },
        raw: sanitize(raw),
        output: result,
        charge,
        startedAt,
        durationMs: Date.now() - start,
      });
      return result;
    } catch (error) {
      const reason = signal.aborted
        ? 'Request timeout or cancellation'
        : error instanceof Error
          ? error.message
          : 'Provider request failed';
      await record({
        type: request.type,
        input: { endpoint: request.endpoint, body: request.body },
        raw: sanitize(raw),
        charge,
        startedAt,
        durationMs: Date.now() - start,
        error: reason,
      });
      throw new Error(reason);
    }
  };
}
export function reported(raw: unknown): number | null {
  const value = object(object(raw).costDollars).total;
  return typeof value === 'number' && value >= 0 ? value : null;
}
