import type OpenAI from 'openai';
import { TRAIL_RACE_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-race-agent-schema';
import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/integrations/openrouter/scrape-models';
import type { TrailRace } from '@/types/trail-race-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import { TRAIL_RACE_AGENT_INSTRUCTIONS } from '@/lib/prompts';
import { parseJsonOutputText } from '@/lib/agents/trail-race-scraper';

export interface OpenRouterServiceResult {
  races: TrailRace[];
  rawModelOutput: string;
  usage: OpenRouterScrapeUsage | null;
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
  const parsed = parseJsonOutputText(rawModelOutput);
  const races = Array.isArray(parsed?.races) ? parsed.races : [];
  const usage = mapCompletionUsageToScrapeUsage(completion.usage);

  return { races, rawModelOutput, usage };
}

export async function runImagesAgent(
  client: OpenAI,
  images: string[],
  model: OpenRouterVisionModelId,
): Promise<OpenRouterServiceResult> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: TRAIL_RACE_AGENT_INSTRUCTIONS },
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
        schema: TRAIL_RACE_AGENT_JSON_SCHEMA as unknown as Record<
          string,
          unknown
        >,
      },
    },
  });

  return extractResult(completion, model);
}

export async function runMarkdownAgent(
  client: OpenAI,
  markdown: string,
  model: OpenRouterScrapeModelId,
): Promise<OpenRouterServiceResult> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: TRAIL_RACE_AGENT_INSTRUCTIONS },
      { role: 'user', content: markdown },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'trail_race',
        strict: true,
        schema: TRAIL_RACE_AGENT_JSON_SCHEMA as unknown as Record<
          string,
          unknown
        >,
      },
    },
  });

  return extractResult(completion, model);
}
