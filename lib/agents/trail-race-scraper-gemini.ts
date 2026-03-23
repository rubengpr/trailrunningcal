import { GoogleGenAI, Type } from '@google/genai';
import { TRAIL_RACE_AGENT_INSTRUCTIONS } from '@/lib/agents/trail-race-scraper';
import type { TrailRaceAgentParsed, TrailRaceAgentRaceRow } from '@/types/trail-race-agent.types';

const MODEL = 'gemini-3.1-flash-lite-preview';

const GEMINI_RACE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    races: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          date: { type: Type.STRING },
          city: { type: Type.STRING },
          province: { type: Type.STRING },
          description: { type: Type.STRING },
          distanceKm: { type: Type.NUMBER },
          elevationGainM: { type: Type.NUMBER, nullable: true },
        },
        required: ['name', 'date', 'city', 'province', 'description', 'distanceKm', 'elevationGainM'],
      },
    },
  },
  required: ['races'],
};

export interface GeminiTrailRaceDomainAgentResult {
  parsed: TrailRaceAgentParsed | null;
  races: TrailRaceAgentRaceRow[];
}

export function requireGoogleAIApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GOOGLE_AI_API_KEY');
  }
  return apiKey;
}

export function createGoogleAIClient(apiKey: string = requireGoogleAIApiKey()): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export async function runGeminiTrailRaceDomainAgent(
  client: GoogleGenAI,
  eventUrl: string,
  model: string = MODEL,
): Promise<GeminiTrailRaceDomainAgentResult> {
  const response = await client.models.generateContent({
    model,
    contents: eventUrl,
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RACE_SCHEMA,
      systemInstruction: TRAIL_RACE_AGENT_INSTRUCTIONS,
    },
  });

  let parsed: TrailRaceAgentParsed | null = null;
  try {
    parsed = JSON.parse(response.text ?? '') as TrailRaceAgentParsed;
  } catch {
    parsed = null;
  }

  const races = Array.isArray(parsed?.races) ? parsed.races : [];

  return { parsed, races };
}
