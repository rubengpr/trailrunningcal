/**
 * Shared JSON Schema for trail race agent structured output (OpenAI Responses + OpenRouter Chat).
 */
export const TRAIL_RACE_AGENT_JSON_SCHEMA = {
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
          // Minimax (and some providers) reject JSON Schema `type` as string[]; use anyOf for nullable.
          elevationGainM: {
            anyOf: [{ type: 'number' }, { type: 'null' }],
          },
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
    // Null when races were found; a short Spanish explanation when races is empty.
    errorMessage: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    },
  },
  required: ['races', 'errorMessage'],
} as const;
