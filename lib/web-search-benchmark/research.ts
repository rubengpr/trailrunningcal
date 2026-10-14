import type {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseInput,
  Tool,
} from 'openai/resources/responses/responses';
import { parseDossier } from '@/lib/blog/research/result';
import { settings, profiles, rates } from '@/lib/web-search-benchmark/config';
import { publicUrl, object, text } from '@/lib/web-search-benchmark/utils';
import type { Complete } from '@/lib/integrations/openai/benchmark-client';
import type {
  Adapter,
  Input,
  Provider,
  RecordEvent,
  ResearchResult,
  Source,
} from '@/types/web-search-benchmark.types';

export interface Prompt {
  instructions: string;
  schema: Record<string, unknown>;
}
const tools: Tool[] = [
  {
    type: 'function',
    name: 'search',
    description:
      'Search the web for sources and relevant content. You can search again to refine the investigation.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: { query: { type: 'string' } },
    },
  },
  {
    type: 'function',
    name: 'read_page',
    description:
      'Read more content from a public URL already found by search or page reading.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['url'],
      properties: { url: { type: 'string' } },
    },
  },
];
function finished(response: Response) {
  if (response.status !== 'completed')
    throw new Error('Incomplete model response');
  if (
    response.output.some(
      (item) =>
        item.type === 'message' &&
        item.content.some((c) => c.type === 'refusal'),
    )
  )
    throw new Error('Model refusal');
}
export async function research(options: {
  provider: Provider;
  input: Input;
  prompt: Prompt;
  complete: Complete;
  adapter?: Adapter;
  record: RecordEvent;
  signal: AbortSignal;
}): Promise<ResearchResult> {
  const { provider, input, prompt, complete, adapter, record, signal } =
    options;
  const evidence = new Map<string, Source>();
  const consulted = new Set<string>();
  let searches = 0;
  let succeeded = 0;
  const history: ResponseInput = [
    { role: 'user', content: JSON.stringify(input) },
  ];
  while (true) {
    signal.throwIfAborted();
    const params: ResponseCreateParamsNonStreaming = {
      model: settings.model,
      reasoning: { effort: settings.researcherReasoning },
      max_output_tokens: settings.maxOutputTokens,
      instructions: prompt.instructions,
      input: history,
      store: false,
      tools:
        provider === 'openai'
          ? [
              {
                type: 'web_search',
                search_context_size: profiles.openai.search_context_size,
                external_web_access: true,
              } as Tool & { external_web_access: boolean },
            ]
          : tools,
      tool_choice: searches
        ? 'auto'
        : provider === 'openai'
          ? 'required'
          : { type: 'function', name: 'search' },
      include:
        provider === 'openai'
          ? ['web_search_call.action.sources', 'reasoning.encrypted_content']
          : ['reasoning.encrypted_content'],
      text: {
        format: {
          type: 'json_schema',
          name: 'event_dossier',
          strict: true,
          schema: prompt.schema,
        },
      },
    };
    const response = await complete(params, signal);
    // Record native tool actions and costs even when the final model response is incomplete.
    for (const item of response.output) {
      if (item.type !== 'web_search_call') continue;
      const action = item.action;
      if (action.type === 'search') {
        searches++;
        for (const source of action.sources ?? []) {
          try {
            consulted.add(publicUrl(source.url));
          } catch {
            /* Ignore unsafe source URLs. */
          }
        }
      } else if (action.url) {
        try {
          consulted.add(publicUrl(action.url));
        } catch {
          /* Ignore unsafe source URLs. */
        }
      }
      await record({
        type: action.type === 'search' ? 'search' : 'read_page',
        input: action,
        raw: item,
        charge: {
          usd: action.type === 'search' ? rates.nativeSearchUsd : 0,
          basis: 'published-rate',
          ...(action.type === 'search'
            ? {
                missing:
                  'Native search content-token billing is not separately exposed by this response',
              }
            : {}),
        },
        startedAt: new Date().toISOString(),
        durationMs: 0,
      });
    }
    finished(response);
    const calls = response.output.filter(
      (item) => item.type === 'function_call',
    );
    if (!calls.length) {
      if (!searches) throw new Error('No web search executed');
      // A dossier written without any search results measures the model, not the provider.
      if (adapter && !succeeded) throw new Error('Every search failed');
      const dossier = parseDossier(
        JSON.parse(response.output_text),
        input.eventName,
        [...consulted],
      );
      return {
        dossier,
        evidence: [...evidence.values()],
        sources: [...consulted],
      };
    }
    if (!adapter) throw new Error('Missing external search adapter');
    history.push(...response.output);
    for (const call of calls) {
      let result: unknown;
      try {
        const args = object(JSON.parse(call.arguments));
        if (call.name === 'search') {
          const query = text(args.query).trim();
          if (!query || query.length > 2000)
            throw new Error('Invalid search query');
          searches++;
          const found = await adapter.search(query, signal);
          succeeded++;
          for (const source of found.sources) {
            consulted.add(source.url);
            if (source.content) evidence.set(source.url, source);
          }
          result = { sources: found.sources, errors: found.errors };
        } else if (call.name === 'read_page') {
          const url = publicUrl(text(args.url));
          if (!consulted.has(url))
            throw new Error('Read a URL returned by search first');
          const found = await adapter.readPage(url, signal);
          for (const source of found.sources) {
            consulted.add(source.url);
            if (source.content) evidence.set(source.url, source);
          }
          result = { sources: found.sources, errors: found.errors };
        } else throw new Error('Unknown tool');
      } catch (error) {
        if (signal.aborted) throw error;
        result = {
          error: error instanceof Error ? error.message : 'Tool failed',
        };
      }
      history.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }
  }
}
