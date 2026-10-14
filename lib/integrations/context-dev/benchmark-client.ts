import { profiles, rates } from '@/lib/web-search-benchmark/config';
import { createHttp } from '@/lib/web-search-benchmark/http';
import {
  list,
  normalize,
  number,
  object,
  publicUrl,
  text,
} from '@/lib/web-search-benchmark/utils';
import type {
  Adapter,
  RecordEvent,
  ToolResult,
} from '@/types/web-search-benchmark.types';

const base = 'https://api.context.dev/v1';

export function createAdapter(
  record: RecordEvent,
  fetcher?: typeof fetch,
): Adapter {
  const post = createHttp(record, fetcher);
  // Every JSON response reports the credits it consumed; failed requests are documented as unbilled.
  const charge = (raw: unknown, status: number): ToolResult['charge'] => {
    const credits = number(object(object(raw).key_metadata).credits_consumed);
    if (credits === null)
      return status >= 400
        ? { usd: 0, basis: 'published-rate' }
        : { usd: null, basis: 'unknown' };
    return {
      usd: credits * rates.contextDevCreditUsd,
      units: credits,
      unit: 'credits',
      basis: 'reported',
    };
  };
  const decodeSearch = (raw: unknown, status: number): ToolResult => {
    const rows = list(object(raw).results).map(object);
    return {
      sources: normalize(
        rows.map((row) => ({
          url: text(row.url),
          title: text(row.title),
          content: text(object(row.markdown).markdown) || text(row.description),
        })),
      ),
      charge: charge(raw, status),
      errors: rows
        .filter((row) => text(object(row.markdown).code) !== 'SUCCESS')
        .map((row) => `${text(row.url)}: ${text(object(row.markdown).code)}`),
    };
  };
  const decodeRead = (raw: unknown, status: number): ToolResult => {
    const root = object(raw);
    const markdown = object(root.markdown);
    return {
      sources: markdown.success
        ? normalize([
            { url: text(root.url), title: '', content: text(markdown.data) },
          ])
        : [],
      charge: charge(raw, status),
      errors: markdown.success
        ? []
        : [text(markdown.error_code) || 'Markdown unavailable'],
    };
  };
  return {
    search: (query, signal) =>
      post(
        {
          endpoint: `${base}/web/search`,
          key: 'CONTEXT_DEV_API_KEY',
          type: 'search',
          body: { query, ...profiles['context-dev'].search },
        },
        signal,
        decodeSearch,
      ),
    readPage: (url, signal) =>
      post(
        {
          endpoint: `${base}/web/scrape`,
          key: 'CONTEXT_DEV_API_KEY',
          type: 'read_page',
          body: { url: publicUrl(url), ...profiles['context-dev'].read },
        },
        signal,
        decodeRead,
      ),
  };
}
