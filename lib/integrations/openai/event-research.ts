import OpenAI from 'openai';
import type {
  ResponseCreateParamsNonStreaming,
  ResponseFunctionWebSearch,
  ResponseInput,
} from 'openai/resources/responses/responses';
import { loadPrompt, traced, wrapOpenAI } from 'braintrust';

import { TRAIL_EVENT_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-event-agent-schema';
import {
  EVENT_RESEARCH_MAX_RETRIES,
  EVENT_RESEARCH_MODEL,
  EVENT_RESEARCH_PROJECT,
  EVENT_RESEARCH_PROMPT_SLUG,
  EVENT_RESEARCH_PROMPT_VERSION,
  EVENT_RESEARCH_REASONING_EFFORT,
  EVENT_RESEARCH_SEARCH_CONTEXT_SIZE,
  EVENT_RESEARCH_TIMEOUT_MS,
} from '@/lib/event-research/config';
import type {
  EventResearchFailure,
  EventResearchRunResult,
  EventResearchUsage,
} from '@/types/event-research.types';
import type { TrailEventAgentParsed } from '@/types/trail-event-agent.types';

interface SpanInfo {
  metadata?: Record<string, unknown>;
}

type TracedResponseParams = ResponseCreateParamsNonStreaming & {
  span_info?: SpanInfo;
};

export interface ResearchEventInput {
  eventName: string;
  model?: string;
  traceMetadata?: Record<string, unknown>;
}

export function sanitizeResearchFailure(error: unknown): EventResearchFailure {
  const name = error instanceof Error ? error.name.toLowerCase() : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return name.includes('timeout') ||
    name.includes('abort') ||
    message.includes('timed out') ||
    message.includes('timeout')
    ? 'timeout'
    : 'api_error';
}

function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .flatMap((part) =>
      typeof part === 'object' &&
      part !== null &&
      'text' in part &&
      typeof part.text === 'string'
        ? [part.text]
        : [],
    )
    .join('\n');
}

function toResponseInput(messages: readonly unknown[]): ResponseInput {
  return messages.flatMap((message) => {
    if (typeof message !== 'object' || message === null || !('role' in message)) {
      return [];
    }
    const role = message.role;
    if (
      role !== 'system' &&
      role !== 'developer' &&
      role !== 'user' &&
      role !== 'assistant'
    ) {
      return [];
    }
    const content = 'content' in message ? messageText(message.content) : '';
    return [{ role, content }];
  });
}

function isWebSearchCall(item: unknown): item is ResponseFunctionWebSearch {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'web_search_call'
  );
}

function sourceUrls(call: ResponseFunctionWebSearch): string[] {
  if (call.action.type === 'search') {
    return (call.action.sources ?? []).map((source) => source.url);
  }
  if (
    (call.action.type === 'open_page' || call.action.type === 'find_in_page') &&
    call.action.url
  ) {
    return [call.action.url];
  }
  return [];
}

function hasRefusal(output: readonly unknown[]): boolean {
  return output.some(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      item.type === 'message' &&
      'content' in item &&
      Array.isArray(item.content) &&
      item.content.some(
        (part) =>
          typeof part === 'object' &&
          part !== null &&
          'type' in part &&
          part.type === 'refusal',
      ),
  );
}

function mapUsage(usage?: {
  input_tokens: number;
  input_tokens_details: { cached_tokens: number };
  output_tokens: number;
  output_tokens_details: { reasoning_tokens: number };
  total_tokens: number;
}): EventResearchUsage {
  if (!usage) {
    return {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
    };
  }
  return {
    inputTokens: usage.input_tokens,
    cachedInputTokens: usage.input_tokens_details.cached_tokens,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details.reasoning_tokens,
    totalTokens: usage.total_tokens,
  };
}

export async function researchEvent(
  input: ResearchEventInput,
): Promise<EventResearchRunResult> {
  const model = input.model ?? EVENT_RESEARCH_MODEL;

  return traced(
    async (span) => {
      const failure = (kind: EventResearchFailure): EventResearchRunResult => {
        span.log({
          output: { failure: kind },
          metadata: { outcome: 'failed', failure: kind },
        });
        return {
          result: null,
          failure: kind,
          response: null,
          braintrustRootSpanId: span.rootSpanId,
        };
      };

      const compilePrompt = async () => {
        const prompt = await loadPrompt({
          projectName: EVENT_RESEARCH_PROJECT,
          slug: EVENT_RESEARCH_PROMPT_SLUG,
          version: EVENT_RESEARCH_PROMPT_VERSION,
        });
        return prompt.build({ input: { eventName: input.eventName } });
      };

      let compiled: Awaited<ReturnType<typeof compilePrompt>>;
      try {
        compiled = await compilePrompt();
      } catch (error) {
        return failure(sanitizeResearchFailure(error));
      }

      const client = wrapOpenAI(
        new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          maxRetries: EVENT_RESEARCH_MAX_RETRIES,
          timeout: EVENT_RESEARCH_TIMEOUT_MS,
        }),
      );
      const params: TracedResponseParams = {
        model,
        input: toResponseInput(compiled.messages),
        reasoning: { effort: EVENT_RESEARCH_REASONING_EFFORT },
        tools: [
          {
            type: 'web_search',
            search_context_size: EVENT_RESEARCH_SEARCH_CONTEXT_SIZE,
          },
        ],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        text: {
          format: {
            type: 'json_schema',
            name: 'trail_event',
            strict: true,
            schema: TRAIL_EVENT_AGENT_JSON_SCHEMA,
          },
        },
        span_info: compiled.span_info,
      };

      let response;
      try {
        response = await client.responses.create(params);
      } catch (error) {
        return failure(sanitizeResearchFailure(error));
      }

      if (response.status !== 'completed') return failure('incomplete_response');
      if (hasRefusal(response.output)) return failure('refusal');

      let result: TrailEventAgentParsed;
      try {
        result = JSON.parse(response.output_text) as TrailEventAgentParsed;
      } catch {
        return failure('parse_error');
      }

      const searchCalls = response.output.filter(isWebSearchCall);
      const sources = [...new Set(searchCalls.flatMap(sourceUrls))];
      const usage = mapUsage(response.usage);
      const outcome =
        result.event !== null && result.races.length > 0 && result.errorMessage === null
          ? 'draft'
          : 'negative';

      span.log({
        output: result,
        metadata: {
          outcome,
          sources,
          searchCallCount: searchCalls.length,
          openAIResponseId: response.id,
          usage,
        },
      });

      return {
        result,
        failure: null,
        response: {
          id: response.id,
          model: response.model,
          status: response.status,
          searchCallCount: searchCalls.length,
          sources,
          usage,
        },
        braintrustRootSpanId: span.rootSpanId,
      };
    },
    {
      name: 'Event research',
      type: 'task',
      event: {
        input: { eventName: input.eventName },
        metadata: {
          environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
          model,
          promptSlug: EVENT_RESEARCH_PROMPT_SLUG,
          promptVersion: EVENT_RESEARCH_PROMPT_VERSION,
          nativeWebSearch: true,
          ...input.traceMetadata,
        },
      },
    },
  );
}
