import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAdapter as exa } from '@/lib/integrations/exa/client';
import { createAdapter as tavily } from '@/lib/integrations/tavily/client';
import { createAdapter as linkup } from '@/lib/integrations/linkup/client';
import { createAdapter as contextDev } from '@/lib/integrations/context-dev/benchmark-client';
const signal = new AbortController().signal;
const url = 'https://example.com/page';
const fetcher = (data: unknown, status = 200) =>
  vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(data), { status }));
afterEach(() => vi.unstubAllEnvs());

describe('provider adapters (offline fixtures)', () => {
  it('Exa uses auto search plus text and reported USD', async () => {
    vi.stubEnv('EXA_API_KEY', 'exa-test-secret');
    const http = fetcher({
      results: [{ url, title: 'Event', text: 'Data' }],
      costDollars: { total: 0.009 },
    });
    const record = vi.fn();
    const output = await exa(record, http).search('Evento', signal);
    expect(output).toMatchObject({
      sources: [{ url, content: 'Data' }],
      charge: { usd: 0.009, basis: 'reported' },
    });
    const [endpoint, init] = http.mock.calls[0];
    expect(endpoint).toContain('/search');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      query: 'Evento',
      type: 'auto',
      numResults: 8,
      contents: { text: { maxCharacters: 12000 } },
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain('exa-test-secret');
  });
  it('Tavily includes usage and preserves failed extraction results', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tavily-test-secret');
    const http = fetcher({
      results: [{ url, raw_content: 'Body' }],
      failed_results: [
        { url: 'https://bad.example.com', error: 'Unavailable' },
      ],
      usage: { credits: 1 },
    });
    const output = await tavily(vi.fn(), http).readPage(url, signal);
    expect(output.charge.usd).toBe(0.008);
    expect(output.sources[0].content).toBe('Body');
    expect(output.errors).toEqual(['Unavailable']);
    expect(JSON.parse(String(http.mock.calls[0][1]?.body))).toMatchObject({
      urls: [url],
      extract_depth: 'basic',
      include_usage: true,
    });
  });
  it('Linkup searchResults and fetch normalize to the same contract', async () => {
    vi.stubEnv('LINKUP_API_KEY', 'linkup-test-secret');
    const http = fetcher({
      results: [{ url, name: 'Event', content: 'Data' }],
    });
    expect(
      (await linkup(vi.fn(), http).search('Evento', signal)).charge.usd,
    ).toBe(0.005);
    expect(JSON.parse(String(http.mock.calls[0][1]?.body))).toMatchObject({
      q: 'Evento',
      depth: 'standard',
      outputType: 'searchResults',
    });
    const read = fetcher({ markdown: 'Body' });
    expect(
      (await linkup(vi.fn(), read).readPage(url, signal)).sources[0].content,
    ).toBe('Body');
  });
  it('Context.dev searches with Markdown, reports credits and keeps failed scrapes as errors', async () => {
    vi.stubEnv('CONTEXT_DEV_API_KEY', 'context-test-secret');
    const http = fetcher({
      results: [
        {
          url,
          title: 'Event',
          description: 'Snippet',
          markdown: { markdown: 'Data', code: 'SUCCESS' },
        },
        {
          url: 'https://blocked.example.com',
          title: 'Blocked',
          description: 'Only snippet',
          markdown: { markdown: null, code: 'WEBSITE_BLOCKED' },
        },
      ],
      key_metadata: { credits_consumed: 2, credits_remaining: 998 },
    });
    const record = vi.fn();
    const output = await contextDev(record, http).search('Evento', signal);
    expect(output.sources.map((s) => s.content)).toEqual([
      'Data',
      'Only snippet',
    ]);
    expect(output.errors).toHaveLength(1);
    expect(output.charge).toMatchObject({ units: 2, basis: 'reported' });
    const [endpoint, init] = http.mock.calls[0];
    expect(endpoint).toBe('https://api.context.dev/v1/web/search');
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer context-test-secret',
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      query: 'Evento',
      numResults: 10,
      markdownOptions: { enabled: true },
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      'context-test-secret',
    );
    const failed = fetcher({
      url,
      markdown: {
        requested: true,
        success: false,
        data: null,
        error_code: 'WEBSITE_BLOCKED',
      },
    });
    const read = await contextDev(vi.fn(), failed).readPage(url, signal);
    expect(read).toMatchObject({ sources: [], errors: ['WEBSITE_BLOCKED'] });
  });
  it('records HTTP failure once without retrying or pretending the cost is zero', async () => {
    vi.stubEnv('EXA_API_KEY', 'exa-test-secret');
    const http = fetcher({ error: 'Rate limit' }, 429);
    const record = vi.fn();
    await expect(exa(record, http).search('Evento', signal)).rejects.toThrow(
      '429',
    );
    expect(http).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledOnce();
    expect(record.mock.calls[0][0]).toMatchObject({
      error: 'Provider HTTP 429',
      charge: { usd: null },
    });
  });
  it('bounds normalized content without truncating raw audit payloads', async () => {
    vi.stubEnv('EXA_API_KEY', 'exa-test-secret');
    const full = 'x'.repeat(14000);
    const record = vi.fn();
    const output = await exa(
      record,
      fetcher({ results: [{ url, title: 'Event', text: full }] }),
    ).readPage(url, signal);
    expect(output.sources[0].content).toHaveLength(12000);
    expect(record.mock.calls[0][0].raw.results[0].text).toHaveLength(14000);
  });
});
