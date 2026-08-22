import { loadPrompt, traced } from 'braintrust';

import { TRAIL_EVENT_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-event-agent-schema';

import {
  MAX_RETRIES,
  MISTRAL_BASE_URL,
  MISTRAL_MODEL,
  MISTRAL_REQUEST_INTERVAL_MS,
  PROJECT_NAME,
  PROMPT_SLUG,
  PROMPT_VERSION,
  REQUEST_TIMEOUT_MS,
} from './config';
import { sanitizeFailure } from './openai-provider';
import type { EventResearchResult, ResearchProvider } from './types';

interface MistralConversationResponse {
  conversation_id?: string;
  outputs?: unknown[];
  usage?: Record<string, unknown>;
}

class MistralHttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterMs: number | null,
    readonly responseBody: string,
  ) {
    super(`Mistral API request failed with status ${status}.`);
    this.name = 'MistralHttpError';
  }
}

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

function compiledPrompt(messages: readonly unknown[]): {
  instructions: string;
  input: string;
} {
  const instructions: string[] = [];
  const inputs: string[] = [];

  for (const message of messages) {
    if (typeof message !== 'object' || message === null || !('role' in message)) {
      continue;
    }

    const content = 'content' in message ? messageText(message.content) : '';
    if (!content) continue;

    if (message.role === 'system' || message.role === 'developer') {
      instructions.push(content);
    } else if (message.role === 'user') {
      inputs.push(content);
    }
  }

  return {
    instructions: instructions.join('\n\n'),
    input: inputs.join('\n\n'),
  };
}

function finalTextOutput(outputs: readonly unknown[]): string {
  for (const output of [...outputs].reverse()) {
    if (typeof output !== 'object' || output === null || !('content' in output)) {
      continue;
    }

    const text = messageText(output.content);
    if (text) return text;
  }

  return '';
}

function sourceUrls(outputs: readonly unknown[]): string[] {
  const serialized = JSON.stringify(outputs);
  return [
    ...new Set(
      [...serialized.matchAll(/https?:\/\/[^"\s]+/g)].map((match) =>
        match[0].replace(/\\\//g, '/'),
      ),
    ),
  ];
}

function searchCallCount(outputs: readonly unknown[]): number {
  return outputs.filter(
    (output) =>
      typeof output === 'object' &&
      output !== null &&
      'type' in output &&
      output.type === 'tool.execution',
  ).length;
}

function retryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function retryDelay(error: unknown, attempt: number): number {
  if (error instanceof MistralHttpError && error.retryAfterMs !== null) {
    return error.retryAfterMs;
  }

  return Math.round((500 * 2 ** attempt) * (0.5 + Math.random()));
}

function safeResponseBody(text: string): string {
  return text.replace(/[\r\n\t]+/g, ' ').slice(0, 500);
}

function failureResult(failure: ReturnType<typeof sanitizeFailure>): EventResearchResult {
  return { result: null, failure, response: null };
}

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

let nextRequestAt = 0;

async function paceRequest(): Promise<void> {
  const now = Date.now();
  const startAt = Math.max(now, nextRequestAt);
  nextRequestAt = startAt + MISTRAL_REQUEST_INTERVAL_MS;
  await wait(startAt - now);
}

async function requestConversation(
  body: Record<string, unknown>,
): Promise<MistralConversationResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await paceRequest();
      const response = await fetch(`${MISTRAL_BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new MistralHttpError(
          response.status,
          retryAfterMs(response.headers.get('retry-after')),
          safeResponseBody(await response.text()),
        );
      }

      return (await response.json()) as MistralConversationResponse;
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof MistralHttpError
          ? error.status === 429 || error.status >= 500
          : true;
      if (attempt < MAX_RETRIES && retryable) await wait(retryDelay(error, attempt));
      else break;
    }
  }

  throw lastError;
}

function failureMetadata(error: unknown): Record<string, unknown> {
  if (!(error instanceof MistralHttpError)) return {};

  return {
    httpStatus: error.status,
    retryAfterMs: error.retryAfterMs,
    responseBody: error.responseBody,
  };
}

export async function createMistralProvider(): Promise<ResearchProvider> {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY is required for the Mistral eval.');
  }

  const prompt = await loadPrompt({
    projectName: PROJECT_NAME,
    slug: PROMPT_SLUG,
    version: PROMPT_VERSION,
  });

  return {
    async research(input) {
      const compiled = prompt.build({ input });
      const request = compiledPrompt(compiled.messages);
      const body = {
        model: MISTRAL_MODEL,
        instructions: request.instructions,
        inputs: request.input,
        store: false,
        tools: [{ type: 'web_search' }],
        completion_args: {
          max_tokens: 4096,
          temperature: 0,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'trail_event',
              schema_definition: TRAIL_EVENT_AGENT_JSON_SCHEMA,
              strict: true,
            },
          },
        },
      };

      try {
        return await traced(
          async (span) => {
            let response: MistralConversationResponse;
            try {
              response = await requestConversation(body);
            } catch (error) {
              span.log({
                metadata: {
                  provider: 'mistral',
                  model: MISTRAL_MODEL,
                  nativeWebSearch: true,
                  ...failureMetadata(error),
                },
              });
              throw error;
            }

            const outputs = response.outputs ?? [];
            const output = finalTextOutput(outputs);
            const sources = sourceUrls(outputs);
            const searches = searchCallCount(outputs);

            span.log({
              output: { conversationId: response.conversation_id, outputs },
              metadata: {
                provider: 'mistral',
                model: MISTRAL_MODEL,
                nativeWebSearch: true,
                sources,
                searchCallCount: searches,
                usage: response.usage,
              },
            });

            try {
              return {
                result: JSON.parse(output),
                failure: null,
                response: {
                  id: response.conversation_id ?? 'unknown',
                  model: MISTRAL_MODEL,
                  status: 'completed',
                  searchCallCount: searches,
                  sources,
                },
              };
            } catch {
              return failureResult('parse_error');
            }
          },
          {
            name: 'Mistral Conversations',
            type: 'llm',
            event: { input: body },
          },
        );
      } catch (error) {
        return failureResult(sanitizeFailure(error));
      }
    },
  };
}
