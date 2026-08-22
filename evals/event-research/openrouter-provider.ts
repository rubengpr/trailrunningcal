import OpenAI from 'openai';
import type { ResponseCreateParamsNonStreaming, ResponseInput } from 'openai/resources/responses/responses';
import { loadPrompt, wrapOpenAI } from 'braintrust';

import { TRAIL_EVENT_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-event-agent-schema';

import {
  MAX_RETRIES,
  OPENROUTER_BASE_URL,
  OPENROUTER_MODEL,
  OPENROUTER_SEARCH_ENGINE,
  PROJECT_NAME,
  PROMPT_SLUG,
  PROMPT_VERSION,
  REASONING_EFFORT,
  REQUEST_TIMEOUT_MS,
} from './config';
import { sanitizeFailure } from './openai-provider';
import type { EventResearchResult, ResearchProvider } from './types';

interface SpanInfo {
  metadata?: Record<string, unknown>;
}

type TracedResponseParams = Omit<ResponseCreateParamsNonStreaming, 'tools'> & {
  max_tool_calls?: number;
  span_info?: SpanInfo;
  tools?: unknown[];
};

function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) =>
      typeof part === 'object' &&
      part !== null &&
      'text' in part &&
      typeof part.text === 'string'
        ? part.text
        : '',
    )
    .filter(Boolean)
    .join('\n');
}

function toResponseInput(messages: readonly unknown[]): ResponseInput {
  return messages.flatMap((message) => {
    if (typeof message !== 'object' || message === null || !('role' in message)) {
      return [];
    }

    const role = message.role;
    if (!['system', 'developer', 'user', 'assistant'].includes(role as string)) {
      return [];
    }

    return [{ role: role as 'system' | 'developer' | 'user' | 'assistant', content: 'content' in message ? messageText(message.content) : '' }];
  });
}

function failureResult(failure: ReturnType<typeof sanitizeFailure>): EventResearchResult {
  return { result: null, failure, response: null };
}

function sourceUrls(response: { output: unknown[] }): string[] {
  const urls = response.output.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const serialized = JSON.stringify(item);
    return [...serialized.matchAll(/https?:\/\/[^"\s]+/g)].map((match) =>
      match[0].replace(/\\\//g, '/'),
    );
  });
  return [...new Set(urls)];
}

export async function createOpenRouterProvider(
  model = OPENROUTER_MODEL,
): Promise<ResearchProvider> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is required for the Gemini eval.');
  }

  const prompt = await loadPrompt({
    projectName: PROJECT_NAME,
    slug: PROMPT_SLUG,
    version: PROMPT_VERSION,
  });
  const client = wrapOpenAI(
    new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
      maxRetries: MAX_RETRIES,
      timeout: REQUEST_TIMEOUT_MS,
    }),
  );

  return {
    async research(input) {
      const compiled = prompt.build({ input });
      const params: TracedResponseParams = {
        model,
        input: toResponseInput(compiled.messages),
        reasoning: { effort: REASONING_EFFORT },
        tools: [
          {
            type: 'openrouter:web_search',
            parameters: { engine: OPENROUTER_SEARCH_ENGINE },
          },
        ],
        tool_choice: 'required',
        max_tool_calls: 10,
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
        response = await client.responses.create(
          params as unknown as ResponseCreateParamsNonStreaming,
        );
      } catch (error) {
        return failureResult(sanitizeFailure(error));
      }

      if (response.status !== 'completed') return failureResult('incomplete_response');

      let result: unknown;
      try {
        result = JSON.parse(response.output_text);
      } catch {
        return failureResult('parse_error');
      }

      return {
        result,
        failure: null,
        response: {
          id: response.id,
          model: response.model,
          status: response.status,
          searchCallCount: Number(
            (response.usage as { server_tool_use?: { web_search_requests?: number } } | undefined)
              ?.server_tool_use?.web_search_requests ?? 0,
          ),
          sources: sourceUrls(response),
        },
      };
    },
  };
}
