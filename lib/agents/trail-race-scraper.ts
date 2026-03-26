import OpenAI from 'openai';
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from 'openai/resources/responses/responses';
import type {
  TrailRaceAgentParsed,
  TrailRaceAgentRaceRow,
} from '@/types/trail-race-agent.types';
import { TRAIL_RACE_AGENT_INSTRUCTIONS } from '@/lib/prompts';

const MODEL = 'gpt-5.4-mini';

export function requireOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  return apiKey;
}

export function createOpenAIClient(
  apiKey: string = requireOpenAIApiKey(),
): OpenAI {
  return new OpenAI({ apiKey });
}

export function hostnameFromEventUrl(eventUrl: string): string {
  const { hostname } = new URL(eventUrl);
  return hostname.replace(/^www\./i, '');
}

export function parseJsonOutputText(
  outputText: string,
): TrailRaceAgentParsed | null {
  try {
    return JSON.parse(outputText) as TrailRaceAgentParsed;
  } catch {
    return null;
  }
}

export const trailRaceAgentTextFormat: ResponseCreateParamsNonStreaming['text'] =
  {
    format: {
      type: 'json_schema',
      name: 'trail_race',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          races: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                date: { type: 'string' },
                city: { type: 'string' },
                province: { type: 'string' },
                description: { type: 'string' },
                distanceKm: { type: 'number' },
                elevationGainM: { type: ['number', 'null'] },
              },
              required: [
                'name',
                'date',
                'city',
                'province',
                'description',
                'distanceKm',
                'elevationGainM',
              ],
            },
          },
        },
        required: ['races'],
      },
    },
  };

export function trailRaceDomainWebSearchTools(
  allowedDomain: string,
): NonNullable<ResponseCreateParamsNonStreaming['tools']> {
  return [
    {
      type: 'web_search',
      filters: { allowed_domains: [allowedDomain] },
      search_context_size: 'low',
    },
  ];
}

export interface RunTrailRaceDomainAgentOptions {
  eventUrl: string;
  allowedDomain?: string;
  model?: string;
  instructions?: string;
  tools?: ResponseCreateParamsNonStreaming['tools'];
  text?: ResponseCreateParamsNonStreaming['text'];
}

export interface TrailRaceDomainAgentResult {
  response: Response;
  parsed: TrailRaceAgentParsed | null;
  races: TrailRaceAgentRaceRow[];
}

/**
 * Single Responses API call with markdown input + structured output (no web search).
 */
export async function runTrailRaceMarkdownAgent(
  client: OpenAI,
  markdown: string,
): Promise<TrailRaceDomainAgentResult> {
  const response = await client.responses.create({
    model: MODEL,
    input: markdown,
    instructions: TRAIL_RACE_AGENT_INSTRUCTIONS,
    text: trailRaceAgentTextFormat,
  });

  const parsed = parseJsonOutputText(response.output_text);
  const races = Array.isArray(parsed?.races) ? parsed.races : [];

  return { response, parsed, races };
}

/**
 * Single Responses API call with web search + structured output (trail race preset).
 */
export async function runTrailRaceDomainAgent(
  client: OpenAI,
  options: RunTrailRaceDomainAgentOptions,
): Promise<TrailRaceDomainAgentResult> {
  const {
    eventUrl,
    allowedDomain = hostnameFromEventUrl(eventUrl),
    model = MODEL,
    instructions = TRAIL_RACE_AGENT_INSTRUCTIONS,
    tools = trailRaceDomainWebSearchTools(allowedDomain),
    text = trailRaceAgentTextFormat,
  } = options;

  const response = await client.responses.create({
    model,
    input: eventUrl,
    instructions,
    tools,
    text,
  });

  const parsed = parseJsonOutputText(response.output_text);
  const races = Array.isArray(parsed?.races) ? parsed.races : [];

  return {
    response,
    parsed,
    races,
  };
}
