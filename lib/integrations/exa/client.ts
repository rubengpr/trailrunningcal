import { profiles, rates } from '@/lib/web-search-benchmark/config';
import { createHttp, reported } from '@/lib/web-search-benchmark/http';
import {
  list,
  normalize,
  object,
  publicUrl,
  text,
} from '@/lib/web-search-benchmark/utils';
import type {
  Adapter,
  RecordEvent,
  ToolResult,
} from '@/types/web-search-benchmark.types';

export function createAdapter(
  record: RecordEvent,
  fetcher?: typeof fetch,
): Adapter {
  const post = createHttp(record, fetcher);
  const decode = (raw: unknown, status: number, read: boolean): ToolResult => {
    const rows = list(object(raw).results);
    const reportedUsd = reported(raw);
    return {
      sources: normalize(
        rows.map((value) => {
          const row = object(value);
          return {
            url: text(row.url),
            title: text(row.title),
            content:
              text(row.text) || list(row.highlights).map(text).join('\n'),
          };
        }),
      ),
      charge:
        reportedUsd !== null
          ? { usd: reportedUsd, basis: 'reported' }
          : status >= 400
            ? { usd: null, basis: 'unknown' }
            : {
                usd: read ? rows.length * rates.exaReadUsd : rates.exaSearchUsd,
                basis: 'published-rate',
              },
      errors: list(object(raw).statuses)
        .filter((value) => object(value).status !== 'success')
        .map((value) => JSON.stringify(value)),
    };
  };
  return {
    search: (query, signal) =>
      post(
        {
          endpoint: 'https://api.exa.ai/search',
          key: 'EXA_API_KEY',
          header: 'x-api-key',
          type: 'search',
          body: { query, ...profiles.exa.search },
        },
        signal,
        (raw, status) => decode(raw, status, false),
      ),
    readPage: (url, signal) =>
      post(
        {
          endpoint: 'https://api.exa.ai/contents',
          key: 'EXA_API_KEY',
          header: 'x-api-key',
          type: 'read_page',
          body: { ids: [publicUrl(url)], ...profiles.exa.read },
        },
        signal,
        (raw, status) => decode(raw, status, true),
      ),
  };
}
