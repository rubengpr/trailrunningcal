import { profiles, rates } from '@/lib/web-search-benchmark/config';
import { createHttp } from '@/lib/web-search-benchmark/http';
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
  return {
    search: (query, signal) =>
      post(
        {
          endpoint: 'https://api.linkup.so/v1/search',
          key: 'LINKUP_API_KEY',
          type: 'search',
          body: { q: query, ...profiles.linkup.search },
        },
        signal,
        (raw, status): ToolResult => ({
          sources: normalize(
            list(object(raw).results).map((value) => {
              const row = object(value);
              return {
                url: text(row.url),
                title: text(row.name) || text(row.title),
                content: text(row.content),
              };
            }),
          ),
          charge:
            status >= 400
              ? { usd: null, basis: 'unknown' }
              : { usd: rates.linkupSearchUsd, basis: 'published-rate' },
          errors: [],
        }),
      ),
    readPage: (url, signal) =>
      post(
        {
          endpoint: 'https://api.linkup.so/v1/fetch',
          key: 'LINKUP_API_KEY',
          type: 'read_page',
          body: { url: publicUrl(url), ...profiles.linkup.read },
        },
        signal,
        (raw, status): ToolResult => ({
          sources: normalize([
            {
              url: publicUrl(url),
              title: '',
              content: text(object(raw).markdown),
            },
          ]),
          charge:
            status >= 400
              ? { usd: null, basis: 'unknown' }
              : { usd: rates.linkupReadUsd, basis: 'published-rate' },
          errors: [],
        }),
      ),
  };
}
