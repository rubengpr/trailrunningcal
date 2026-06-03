import type OpenAI from 'openai';
import { APIConnectionTimeoutError } from 'openai/error';
import { TimeoutError } from '@/lib/errors';
import { TRAIL_EVENT_DESCRIPTION_JSON_SCHEMA } from '@/lib/agents/trail-event-description-schema';
import { TRAIL_EVENT_DESCRIPTION_INSTRUCTIONS } from '@/lib/prompts/trail-event-description-instructions';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';

export interface EventDescriptionAgentResult {
  description: string | null;
  errorMessage: string | null;
  rawModelOutput: string;
  usage: OpenRouterScrapeUsage | null;
}

function stripMarkdownJsonCodeFence(text: string): string {
  let value = text.trim();
  if (!value.startsWith('```')) {
    return value;
  }

  value = value.replace(/^```[^\n]*\r?\n?/, '');
  value = value.replace(/\r?\n?```\s*$/, '');
  return value.trim();
}

function parseJsonOutputText(outputText: string): Record<string, unknown> | null {
  const fencedStripped = stripMarkdownJsonCodeFence(outputText);

  try {
    return JSON.parse(fencedStripped) as Record<string, unknown>;
  } catch {
    const firstBrace = fencedStripped.indexOf('{');
    const lastBrace = fencedStripped.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(
        fencedStripped.slice(firstBrace, lastBrace + 1),
      ) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function mapCompletionUsageToScrapeUsage(
  usage: unknown,
): OpenRouterScrapeUsage | null {
  if (usage === null || usage === undefined || typeof usage !== 'object') {
    return null;
  }

  const record = usage as Record<string, unknown>;
  const promptTokens = record.prompt_tokens;
  const completionTokens = record.completion_tokens;
  const totalTokens = record.total_tokens;
  if (
    typeof promptTokens !== 'number' ||
    typeof completionTokens !== 'number' ||
    typeof totalTokens !== 'number'
  ) {
    return null;
  }

  const details = record.completion_tokens_details;
  let reasoningTokens: number | null = null;
  if (details && typeof details === 'object') {
    const reasoning = (details as Record<string, unknown>).reasoning_tokens;
    if (typeof reasoning === 'number') {
      reasoningTokens = reasoning;
    }
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    reasoningTokens,
  };
}

function parseResult(
  completion: OpenAI.Chat.ChatCompletion,
): EventDescriptionAgentResult {
  const rawModelOutput =
    typeof completion.choices[0]?.message?.content === 'string'
      ? completion.choices[0].message.content
      : '';
  const parsed = parseJsonOutputText(rawModelOutput);
  const description =
    typeof parsed?.description === 'string' && parsed.description.trim().length > 0
      ? parsed.description.trim()
      : null;
  const errorMessage =
    typeof parsed?.errorMessage === 'string' && parsed.errorMessage.trim().length > 0
      ? parsed.errorMessage.trim()
      : null;

  return {
    description,
    errorMessage: description ? null : (errorMessage ?? 'No se pudo generar una descripción útil.'),
    rawModelOutput,
    usage: mapCompletionUsageToScrapeUsage(completion.usage),
  };
}

export async function runEventDescriptionAgent(
  client: OpenAI,
  input: string,
  model: OpenRouterScrapeModelId,
): Promise<EventDescriptionAgentResult> {
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: TRAIL_EVENT_DESCRIPTION_INSTRUCTIONS },
        { role: 'user', content: input },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'trail_event_description',
          strict: true,
          schema: TRAIL_EVENT_DESCRIPTION_JSON_SCHEMA as unknown as Record<
            string,
            unknown
          >,
        },
      },
    });

    return parseResult(completion);
  } catch (error) {
    if (error instanceof APIConnectionTimeoutError) {
      throw new TimeoutError('Openrouter');
    }
    throw error;
  }
}
