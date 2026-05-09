import OpenAI from 'openai';
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from 'openai/resources/responses/responses';
import type {
  TrailRaceAgentParsed,
  TrailRace,
} from '@/types/trail-race-agent.types';
import { TRAIL_RACE_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-race-agent-schema';
import { TRAIL_RACE_AGENT_INSTRUCTIONS } from '@/lib/prompts';

const MODEL = 'gpt-5.4-mini';

const FALLBACK_EMPTY_MESSAGE =
  'No se encontraron carreras adultas de trail válidas en el contenido proporcionado.';

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

/**
 * Some chat models (e.g. Minimax via OpenRouter) wrap JSON in markdown fences even when
 * `response_format` asks for raw JSON. Strip fences so `JSON.parse` succeeds.
 */
function stripMarkdownJsonCodeFence(text: string): string {
  let s = text.trim();
  if (!s.startsWith('```')) {
    return s;
  }
  s = s.replace(/^```[^\n]*\r?\n?/, '');
  s = s.replace(/\r?\n?```\s*$/, '');
  return s.trim();
}

function tryParseTrailRaceJson(raw: string): TrailRaceAgentParsed | null {
  try {
    return JSON.parse(raw) as TrailRaceAgentParsed;
  } catch {
    return null;
  }
}

export function parseJsonOutputText(
  outputText: string,
): TrailRaceAgentParsed | null {
  const fencedStripped = stripMarkdownJsonCodeFence(outputText);
  const direct = tryParseTrailRaceJson(fencedStripped);
  if (direct) {
    return direct;
  }

  const firstBrace = fencedStripped.indexOf('{');
  const lastBrace = fencedStripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParseTrailRaceJson(
      fencedStripped.slice(firstBrace, lastBrace + 1),
    );
  }

  return null;
}

export const trailRaceAgentTextFormat: ResponseCreateParamsNonStreaming['text'] =
  {
    format: {
      type: 'json_schema',
      name: 'trail_race',
      strict: true,
      schema: TRAIL_RACE_AGENT_JSON_SCHEMA as unknown as Record<
        string,
        unknown
      >,
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
  races: TrailRace[];
  errorMessage: string | null;
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
  const errorMessage =
    races.length === 0
      ? (typeof parsed?.errorMessage === 'string' ? parsed.errorMessage : FALLBACK_EMPTY_MESSAGE)
      : null;

  return { response, parsed, races, errorMessage };
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
  const errorMessage =
    races.length === 0
      ? (typeof parsed?.errorMessage === 'string' ? parsed.errorMessage : FALLBACK_EMPTY_MESSAGE)
      : null;

  return {
    response,
    parsed,
    races,
    errorMessage,
  };
}
