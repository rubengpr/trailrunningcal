import type OpenAI from 'openai';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import { buildEventDescriptionFormatPrompt } from '@/lib/prompts/event-description-format-instructions';

const MIN_DESCRIPTION_LENGTH = 400;

function normalizeDescription(description: string): string {
  return description
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0)
    .join('\n\n');
}

function getParagraphs(description: string): string[] {
  return description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function isValidDescriptionFormat(description: string): boolean {
  return (
    description.length >= MIN_DESCRIPTION_LENGTH &&
    getParagraphs(description).length >= 2
  );
}

function resultWithUpdatedDescription(
  result: OpenRouterServiceResult,
  description: string,
): OpenRouterServiceResult {
  if (!result.event) {
    return result;
  }

  const event = { ...result.event, description };

  return {
    ...result,
    event,
    rawModelOutput: JSON.stringify({
      event,
      races: result.races,
      errorMessage: result.errorMessage,
    }),
  };
}

function formatRaceFacts(result: OpenRouterServiceResult): string {
  if (result.races.length === 0) {
    return 'No hay carreras extraidas.';
  }

  return result.races
    .map((race, index) => {
      const name = race.name?.trim() || 'Sin nombre especifico';
      const date = race.date ?? 'Fecha no disponible';
      const elevation =
        race.elevationGainM === null
          ? 'Desnivel no disponible'
          : `${race.elevationGainM} m`;

      return [
        `${index + 1}. ${name}`,
        `fecha: ${date}`,
        `ubicacion: ${race.city}, ${race.province}`,
        `distancia: ${race.distanceKm} km`,
        `desnivel: ${elevation}`,
      ].join('; ');
    })
    .join('\n');
}

function buildDescriptionFormatPrompt(result: OpenRouterServiceResult): string {
  const event = result.event;

  return buildEventDescriptionFormatPrompt({
    eventName: event?.name ?? null,
    websiteUrl: event?.websiteUrl ?? null,
    raceFacts: formatRaceFacts(result),
    currentDescription: event?.description ?? '',
  });
}

async function repairDescriptionFormat(
  client: OpenAI,
  result: OpenRouterServiceResult,
): Promise<string | null> {
  const completion = await client.chat.completions.create({
    model: 'openai/gpt-5.4-nano',
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: buildDescriptionFormatPrompt(result),
      },
    ],
  });

  const repaired = completion.choices[0]?.message?.content?.trim();
  return repaired && repaired.length > 0
    ? normalizeDescription(repaired)
    : null;
}

export async function checkDescriptionFormat(
  client: OpenAI,
  result: OpenRouterServiceResult,
): Promise<OpenRouterServiceResult> {
  const description = result.event?.description;
  if (!description?.trim()) {
    return result;
  }

  const normalizedDescription = normalizeDescription(description);
  if (isValidDescriptionFormat(normalizedDescription)) {
    return resultWithUpdatedDescription(result, normalizedDescription);
  }

  try {
    const repairedDescription = await repairDescriptionFormat(client, {
      ...result,
      event: result.event
        ? { ...result.event, description: normalizedDescription }
        : result.event,
    });

    return repairedDescription
      ? resultWithUpdatedDescription(result, repairedDescription)
      : result;
  } catch (error) {
    console.error('OpenRouter description format repair failed', { error });
    return result;
  }
}
