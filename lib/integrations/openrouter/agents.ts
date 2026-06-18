import type OpenAI from 'openai';
import { APIConnectionTimeoutError } from 'openai/error';
import { TRAIL_EVENT_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-event-agent-schema';
import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/integrations/openrouter/scrape-models';
import type {
  TrailEventAgentEvent,
  TrailEventAgentParsed,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import { TRAIL_EVENT_AGENT_INSTRUCTIONS } from '@/lib/prompts/trail-event-agent-instructions';
import { TimeoutError } from '@/lib/errors';
import { normalizeRaceName } from '@/lib/races/utils';

export interface OpenRouterServiceResult {
  event: TrailEventAgentEvent | null;
  races: TrailEventAgentRace[];
  errorMessage: string | null;
  rawModelOutput: string;
  usage: OpenRouterScrapeUsage | null;
}

function normalizeRaces(races: TrailEventAgentRace[]): TrailEventAgentRace[] {
  return races.map((race) => ({
    ...race,
    name: normalizeRaceName(race.name),
  }));
}

function stripMarkdownJsonCodeFence(text: string): string {
  let s = text.trim();
  if (!s.startsWith('```')) {
    return s;
  }
  s = s.replace(/^```[^\n]*\r?\n?/, '');
  s = s.replace(/\r?\n?```\s*$/, '');
  return s.trim();
}

function tryParseAgentJson(raw: string): TrailEventAgentParsed | null {
  try {
    return JSON.parse(raw) as TrailEventAgentParsed;
  } catch {
    return null;
  }
}

function parseAgentOutput(outputText: string): TrailEventAgentParsed | null {
  const fencedStripped = stripMarkdownJsonCodeFence(outputText);
  const direct = tryParseAgentJson(fencedStripped);
  if (direct) {
    return direct;
  }

  const firstBrace = fencedStripped.indexOf('{');
  const lastBrace = fencedStripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParseAgentJson(fencedStripped.slice(firstBrace, lastBrace + 1));
  }

  return null;
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
  const cost = record.cost;
  if (
    typeof promptTokens !== 'number' ||
    typeof completionTokens !== 'number' ||
    typeof totalTokens !== 'number'
  ) {
    return null;
  }

  const details = record.completion_tokens_details;
  let reasoningTokens: number | null = null;
  if (
    details !== null &&
    details !== undefined &&
    typeof details === 'object'
  ) {
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
    cost: typeof cost === 'number' ? cost : null,
  };
}

function openRouterProviderErrorMessage(
  completionRecord: Record<string, unknown>,
): string | null {
  const apiError = completionRecord.error;
  if (
    apiError &&
    typeof apiError === 'object' &&
    apiError !== null &&
    'message' in apiError &&
    typeof (apiError as { message: unknown }).message === 'string'
  ) {
    return (apiError as { message: string }).message;
  }
  return null;
}

function extractResult(
  completion: OpenAI.Chat.ChatCompletion,
  model: string,
): OpenRouterServiceResult {
  const choices = completion.choices;
  if (choices === undefined || choices.length === 0) {
    const completionRecord = completion as unknown as Record<string, unknown>;
    const providerMessage = openRouterProviderErrorMessage(completionRecord);
    if (providerMessage) {
      console.error('OpenRouter API error', {
        model,
        message: providerMessage,
      });
      throw new Error(providerMessage);
    }
    console.error('OpenRouter completion has no usable choices', {
      model,
      choicesMissing: choices === undefined,
      choiceCount: choices?.length ?? 0,
      completionId: completionRecord.id,
      topLevelKeys: Object.keys(completionRecord),
      error: completionRecord.error,
    });
    throw new Error('OpenRouter returned no completion choices');
  }

  const messageContent = choices[0].message?.content;
  const rawModelOutput =
    typeof messageContent === 'string' ? messageContent : '';
  const parsed = parseAgentOutput(rawModelOutput);
  const event =
    parsed?.event && typeof parsed.event.name === 'string'
      ? parsed.event
      : null;
  const races = Array.isArray(parsed?.races)
    ? normalizeRaces(parsed.races)
    : [];
  const errorMessage =
    typeof parsed?.errorMessage === 'string' ? parsed.errorMessage : null;
  const usage = mapCompletionUsageToScrapeUsage(completion.usage);

  return { event, races, errorMessage, rawModelOutput, usage };
}

export async function runImagesAgent(
  client: OpenAI,
  images: string[],
  model: OpenRouterVisionModelId,
): Promise<OpenRouterServiceResult> {
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: TRAIL_EVENT_AGENT_INSTRUCTIONS },
        {
          role: 'user',
          content: images.map((url) => ({
            type: 'image_url' as const,
            image_url: { url },
          })),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'trail_race',
          strict: true,
          schema: TRAIL_EVENT_AGENT_JSON_SCHEMA as unknown as Record<
            string,
            unknown
          >,
        },
      },
    });

    return extractResult(completion, model);
  } catch (err) {
    if (err instanceof APIConnectionTimeoutError) {
      throw new TimeoutError('Openrouter');
    }
    throw err;
  }
}

export async function runMarkdownAgent(
  client: OpenAI,
  markdown: string,
  model: OpenRouterScrapeModelId,
): Promise<OpenRouterServiceResult> {
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: TRAIL_EVENT_AGENT_INSTRUCTIONS },
        { role: 'user', content: markdown },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'trail_race',
          strict: true,
          schema: TRAIL_EVENT_AGENT_JSON_SCHEMA as unknown as Record<
            string,
            unknown
          >,
        },
      },
    });

    return extractResult(completion, model);
  } catch (err) {
    if (err instanceof APIConnectionTimeoutError) {
      throw new TimeoutError('Openrouter');
    }
    throw err;
  }
}
