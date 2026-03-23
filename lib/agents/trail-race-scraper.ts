import OpenAI from 'openai';
import type { Response, ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';
import type { TrailRaceAgentParsed, TrailRaceAgentRaceRow } from '@/types/trail-race-agent.types';

const MODEL = 'gpt-5.4-mini';

export function requireOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  return apiKey;
}

export function createOpenAIClient(apiKey: string = requireOpenAIApiKey()): OpenAI {
  return new OpenAI({ apiKey });
}

export function hostnameFromEventUrl(eventUrl: string): string {
  const { hostname } = new URL(eventUrl);
  return hostname.replace(/^www\./i, '');
}

export function parseJsonOutputText(outputText: string): TrailRaceAgentParsed | null {
  try {
    return JSON.parse(outputText) as TrailRaceAgentParsed;
  } catch {
    return null;
  }
}

export const TRAIL_RACE_AGENT_INSTRUCTIONS = `
## Role and mission

You are a meticulous trail-running data scrapper for a trail races calendar.

Your mission is to find and output relevant data of the adult trail races in the event fetching data only from its website (event_url) accurately, in Spanish, without fabricating or guessing facts.

## Discovery and web search

- **Domain scope only:** Use web search to extract data from the landing page, and follow links on the domain and from wikiloc or komoot. Do **not** search, open, cite, or use content from any other domain or subdomain outside the specified here.
- **Hunt technical specs for every adult modality:** **distance (km)** and **positive elevation gain (m)**. Use on-domain search and follow links until you find explicit figures on the domain or confirm they are not published. If they don't exist in the landing pages, visit relevant domain paths.
- Prefer paths likely to hold rich race details (e.g. inscripción, inscripciones, recorrido, distancias, modalidades, reglamento).
- When calling web search, write **every query in Spanish** (e.g. carrera, distancia, desnivel, circuito, inscripción). Keep operators such as \`site:\` unchanged.

## Output shape

- Return a structured JSON with a \`races\` array.
- If nothing qualifies, return races as an empty array—keep the field, no nulls, no invented races.
- **One object per race** described in the content: single-race sites → one element; multi-distance events → one element per distance/modality.
- **Always include walk modalities** when the site lists them with a distance: **caminada** / caminada popular and **marcha** / **marxa** (Catalan).
- All user-facing text in the JSON (e.g. descriptions) must be **Spanish**.
- Only include races happening in future dates.

## Field rules

- If a value cannot be determined with **certainty**, use \`null\` (except where inference below is explicitly allowed).
- **name** must always be distinct for each race and end with the distance as \` - {distanceKm}K\` (e.g. \`Cursa del Roc Gros - 12K\`, \`Cursa del Roc Gros - 21K\`) so variants are distinguishable. Always use integers.
- **date**: \`YYYY-MM-DD\`.
- **city** / **province**: if one is missing from results but the other is known, infer the missing one from the known one when reasonable; otherwise \`null\`.
- **description**: 400–600 characters, **always 2 paragraphs**, unique per race. For distance variants, center each on that variant's route, elevation, and suitability. Aim at amateur runners: difficulty, terrain, what to expect. Mention championships, cup standings, or notable climbs when stated. **Third person only.**
- **distanceKm**: number in kilometers, or \`null\` if not stated. Parse forms like \`25km\`, \`25 km\`, \`25km y 1500m\`.
- **elevationGainM**: number in **meters**, or \`null\` if not stated. Parse forms like \`+1200m\`, \`1200m\`, \`1.200m\`, \`1500 m+\`.

## Hard constraints

- Respect **domain scope** (see Discovery): inspect wikiloc or komoot domain if found in the domain.
- Do **not** invent or infer facts beyond what the content (and the city/province rule above) supports.
- **Exclude children's races** entirely (e.g. infantil, juvenil, benjamín, alevín, prebenjamín, or any race aimed at children).
- Always rely on domain data first. Use wikiloc or komoot data as fallback.
`.trim();

export const trailRaceAgentTextFormat: ResponseCreateParamsNonStreaming['text'] = {
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

export function trailRaceDomainWebSearchTools(allowedDomain: string): NonNullable<ResponseCreateParamsNonStreaming['tools']> {
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
