import type { Provider } from '@/types/web-search-benchmark.types';

export const providers: Provider[] = [
  'openai',
  'exa',
  'tavily',
  'linkup',
  'context-dev',
];
export const settings = {
  model: 'gpt-6.1-sol',
  researcherReasoning: 'medium',
  judgeReasoning: 'medium',
  maxOutputTokens: 4000,
  judgeMaxOutputTokens: 12000,
  timeoutMs: 600_000,
  maxRetries: 0,
  maxResults: 8,
  maxContentCharacters: 12_000,
  concurrency: 2,
  trials: 3,
  seed: 20261014,
} as const;
export const profiles = {
  openai: {
    tool: 'web_search',
    search_context_size: 'high',
    external_web_access: true,
  },
  exa: {
    search: {
      type: 'auto',
      numResults: 8,
      contents: { text: { maxCharacters: 12_000 }, maxAgeHours: 0 },
    },
    read: { text: { maxCharacters: 12_000 }, maxAgeHours: 0 },
  },
  tavily: {
    search: {
      topic: 'general',
      search_depth: 'advanced',
      max_results: 8,
      chunks_per_source: 3,
      include_answer: false,
      include_raw_content: false,
      include_usage: true,
    },
    read: { extract_depth: 'basic', format: 'markdown', include_usage: true },
  },
  linkup: {
    search: { depth: 'standard', outputType: 'searchResults', maxResults: 8 },
    read: { mode: 'standard', renderJs: false },
  },
  // The API minimum is 10 results; normalize passes the first 8 to the model like other providers.
  'context-dev': {
    search: {
      numResults: 10,
      country: 'es',
      markdownOptions: { enabled: true, includeLinks: false },
    },
    read: {
      formats: { markdown: true },
      markdownParams: { includeLinks: false },
      maxAgeMs: 0,
    },
  },
} as const;
export const keyNames: Record<Provider, string[]> = {
  openai: ['OPENAI_API_KEY'],
  exa: ['OPENAI_API_KEY', 'EXA_API_KEY'],
  tavily: ['OPENAI_API_KEY', 'TAVILY_API_KEY'],
  linkup: ['OPENAI_API_KEY', 'LINKUP_API_KEY'],
  'context-dev': ['OPENAI_API_KEY', 'CONTEXT_DEV_API_KEY'],
};
export const rates = {
  date: '2026-10-14',
  inputPerMillion: 2,
  cachedPerMillion: 0.1,
  outputPerMillion: 10,
  longInputPerMillion: 4,
  longCachedPerMillion: 0.2,
  longOutputPerMillion: 15,
  nativeSearchUsd: 0.01,
  exaSearchUsd: 0.007,
  exaReadUsd: 0.001,
  tavilyCreditUsd: 0.008,
  linkupSearchUsd: 0.005,
  linkupReadUsd: 0.001,
  // Developer plan: $19 for 7,500 credits.
  contextDevCreditUsd: 19 / 7500,
  references: [
    'https://developers.openai.com/api/docs/pricing',
    'https://exa.ai/docs/admin/pricing',
    'https://docs.tavily.com/documentation/api-credits',
    'https://docs.linkup.so/pages/documentation/endpoints/search/overview',
    'https://docs.linkup.so/pages/documentation/endpoints/fetch/overview',
    'https://docs.context.dev/account/credits',
    'https://www.context.dev/pricing',
  ],
} as const;
