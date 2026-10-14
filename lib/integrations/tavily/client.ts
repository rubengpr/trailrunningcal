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

export function createAdapter(
  record: RecordEvent,
  fetcher?: typeof fetch,
): Adapter {
  const post = createHttp(record, fetcher);
  const decode = (raw: unknown, status: number, read: boolean): ToolResult => {
    const root = object(raw);
    const rows = list(root.results);
    const credits = number(object(root.usage).credits);
    return {
      sources: normalize(
        rows.map((value) => {
          const row = object(value);
          return {
            url: text(row.url),
            title: text(row.title),
            content: text(read ? row.raw_content : row.content),
          };
        }),
      ),
      charge:
        status >= 400 && credits === null
          ? { usd: null, basis: 'unknown' }
          : {
              usd:
                (credits ?? (read ? rows.length / 5 : 2)) *
                rates.tavilyCreditUsd,
              units: credits ?? (read ? rows.length / 5 : 2),
              unit: 'credits',
              basis: 'published-rate',
            },
      errors: list(root.failed_results).map(
        (value) => text(object(value).error) || 'Extraction failed',
      ),
    };
  };
  return {
    search: (query, signal) =>
      post(
        {
          endpoint: 'https://api.tavily.com/search',
          key: 'TAVILY_API_KEY',
          type: 'search',
          body: { query, ...profiles.tavily.search },
        },
        signal,
        (raw, status) => decode(raw, status, false),
      ),
    readPage: (url, signal) =>
      post(
        {
          endpoint: 'https://api.tavily.com/extract',
          key: 'TAVILY_API_KEY',
          type: 'read_page',
          body: { urls: [publicUrl(url)], ...profiles.tavily.read },
        },
        signal,
        (raw, status) => decode(raw, status, true),
      ),
  };
}
