export const EVENT_DESCRIPTION_FORMAT_INSTRUCTIONS = `
Rewrite the trail running event description so it is suitable for production.

Rules:
- Write in Spanish.
- 600-900 characters-long.
- Preserve facts from the current description and extracted facts.
- Do not invent mountains, services, race data, organizers, awards, or logistics.
- Return only the rewritten description.
- Use exactly 2 paragraphs. Separate the paragraphs explicitly with \\n\\n.
- Include in the first paragraph insightful event data like edition, mountains or natural spaces the races pass through, type of terrain, and things that make the event special. Reserve the second paragraph to mention services provided, kids races, refreshments or 'avituallamientos' available, and other useful data for amateur trail runners.
- Use a natural third-person editorial tone for a trail running calendar.
- Don't mention data constraints.
- Keep in mind this description will be published and read by real visitors.
`.trim();

export function buildEventDescriptionFormatPrompt(input: {
  eventName: string | null;
  websiteUrl: string | null;
  raceFacts: string;
  currentDescription: string;
}): string {
  return `
${EVENT_DESCRIPTION_FORMAT_INSTRUCTIONS}

Extracted event facts:
- Event name: ${input.eventName ?? 'No disponible'}
- Website URL: ${input.websiteUrl ?? 'No disponible'}

Extracted race facts:
${input.raceFacts}

Current description:
${input.currentDescription}
`.trim();
}
