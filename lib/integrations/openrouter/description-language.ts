import type OpenAI from 'openai';
import { franc } from 'franc';
import type { OpenRouterServiceResult } from '@/lib/integrations/openrouter/agents';
import { EVENT_DESCRIPTION_TRANSLATION_INSTRUCTIONS } from '@/lib/prompts/event-description-translation-instructions';

function isCatalanDescription(description: string): boolean {
  return franc(description, { only: ['spa', 'cat'] }) === 'cat';
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

async function translateDescription(
  client: OpenAI,
  description: string,
): Promise<string | null> {
  const completion = await client.chat.completions.create({
    model: 'openai/gpt-5.4-nano',
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `${EVENT_DESCRIPTION_TRANSLATION_INSTRUCTIONS}${description}`,
      },
    ],
  });

  const translated = completion.choices[0]?.message?.content?.trim();
  return translated && translated.length > 0 ? translated : null;
}

export async function checkDescriptionLang(
  client: OpenAI,
  result: OpenRouterServiceResult,
): Promise<OpenRouterServiceResult> {
  const description = result.event?.description?.trim();
  if (!description || !isCatalanDescription(description)) {
    return result;
  }

  try {
    const translated = await translateDescription(client, description);
    return translated
      ? resultWithUpdatedDescription(result, translated)
      : result;
  } catch (error) {
    console.error('OpenRouter description translation failed', { error });
    return result;
  }
}
