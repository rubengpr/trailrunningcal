/**
 * Shared JSON Schema for trail event agent structured output (OpenAI Responses + OpenRouter Chat).
 */
export const TRAIL_EVENT_AGENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    event: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            // Minimax (and some providers) reject JSON Schema `type` as string[]; use anyOf for nullable.
            description: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            websiteUrl: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
          },
          required: ['name', 'description', 'websiteUrl'],
        },
        { type: 'null' },
      ],
    },
    races: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          date: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
          },
          city: { type: 'string' },
          province: { type: 'string' },
          distanceKm: { type: 'integer' },
          elevationGainM: {
            anyOf: [{ type: 'integer' }, { type: 'null' }],
          },
        },
        required: [
          'name',
          'date',
          'city',
          'province',
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
  required: ['event', 'races', 'errorMessage'],
} as const;
