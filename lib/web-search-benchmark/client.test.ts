import { describe, it, expect, vi, afterEach } from 'vitest';
import { createClient } from '@/lib/integrations/openai/benchmark-client';
import { logEvent, attach } from '@/lib/web-search-benchmark/trace';
import type { Span } from 'braintrust';
import { JSONAttachment } from 'braintrust';
import type { Event } from '@/types/web-search-benchmark.types';
const mocks = vi.hoisted(() => ({ create: vi.fn(), options: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    responses = { create: mocks.create };
    constructor(options: unknown) {
      mocks.options(options);
    }
  },
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('LLM usage and traces (no network)', () => {
  it.each([
    [1000, 200, 100, 0.00262],
    [300000, 100000, 1000, 0.835],
  ])(
    'accounts cached/uncached usage for %s input tokens',
    async (input, cached, output, expected) => {
      vi.stubEnv('OPENAI_API_KEY', 'openai-test-secret');
      mocks.create.mockResolvedValue({
        usage: {
          input_tokens: input,
          input_tokens_details: { cached_tokens: cached },
          output_tokens: output,
        },
      });
      const record = vi.fn();
      await createClient(record)(
        { model: 'gpt-6.1-sol', input: 'Event' },
        new AbortController().signal,
      );
      expect(record.mock.calls[0][0].charge.usd).toBeCloseTo(expected, 8);
      expect(mocks.options).toHaveBeenCalledWith({
        apiKey: 'openai-test-secret',
        timeout: 600000,
        maxRetries: 0,
      });
      expect(mocks.create.mock.calls[0][1]).toMatchObject({
        maxRetries: 0,
        timeout: 600000,
      });
      expect(JSON.stringify(record.mock.calls)).not.toContain(
        'openai-test-secret',
      );
    },
  );
  it('records an unknown charge on a failed request with no retry', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'openai-test-secret');
    mocks.create.mockRejectedValue(new Error('Provider failure'));
    const record = vi.fn();
    await expect(
      createClient(record)(
        { model: 'gpt-6.1-sol', input: 'Event' },
        new AbortController().signal,
      ),
    ).rejects.toThrow('LLM request failed');
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(record.mock.calls[0][0].charge.usd).toBeNull();
  });
  it('uses stable span identities on replay, preserves raw results, and attaches large payloads', () => {
    const child = { log: vi.fn(), end: vi.fn() };
    const root = {
      id: 'root-id',
      startSpan: vi.fn().mockReturnValue(child),
    } as unknown as Span;
    const event: Event = {
      type: 'search',
      input: { query: 'Event' },
      raw: { results: ['raw'] },
      output: { sources: ['normalized'] },
      charge: { usd: 0.007, basis: 'reported' },
      startedAt: '2026-10-14T01:00:00Z',
      durationMs: 200,
    };
    logEvent(root, event, 0, 'research');
    logEvent(root, event, 0, 'research');
    expect(vi.mocked(root.startSpan).mock.calls[0][0]).toEqual(
      vi.mocked(root.startSpan).mock.calls[1][0],
    );
    expect(child.log.mock.calls[0][0].output).toEqual({
      raw: { results: ['raw'] },
      normalized: { sources: ['normalized'] },
    });
    expect(attach({ body: 'x'.repeat(70000) }, 'large')).toBeInstanceOf(
      JSONAttachment,
    );
    expect(child.end).toHaveBeenCalledWith({
      endTime: Date.parse(event.startedAt) / 1000 + 0.2,
    });
  });
});
