import { JSONAttachment } from 'braintrust';
import type { Span } from 'braintrust';
import { hash, identifier, sanitize } from '@/lib/web-search-benchmark/utils';
import type { Event } from '@/types/web-search-benchmark.types';

export function attach(value: unknown, name: string) {
  const safe = sanitize(value);
  return JSON.stringify(safe).length > 64_000
    ? new JSONAttachment(safe, { filename: `${name}.json`, pretty: true })
    : safe;
}
export function logEvent(
  root: Span,
  event: Event,
  index: number,
  phase: string,
) {
  const span = root.startSpan({
    event: { id: identifier(`${root.id}:${phase}:${index}`) },
    spanId: hash(`${root.id}:${phase}:${index}`).slice(0, 16),
    name: `${phase}.${event.type}`,
    type: event.type === 'llm' ? 'llm' : 'tool',
    startTime: new Date(event.startedAt).getTime() / 1000,
  });
  try {
    span.log({
      input: attach(event.input, `request-${index}`),
      output: attach(
        { raw: event.raw, normalized: event.output },
        `response-${index}`,
      ),
      metadata: {
        charge: event.charge,
        event_index: index,
        ...(event.error ? { error: event.error } : {}),
      },
      ...(event.error ? { error: event.error } : {}),
      metrics: {
        ...(event.charge.usd === null ? {} : { cost: event.charge.usd }),
        ...(event.usage
          ? {
              prompt_tokens: event.usage.inputTokens,
              completion_tokens: event.usage.outputTokens,
              tokens: event.usage.inputTokens + event.usage.outputTokens,
            }
          : {}),
      },
    });
  } finally {
    span.end({
      endTime:
        new Date(event.startedAt).getTime() / 1000 + event.durationMs / 1000,
    });
  }
}
