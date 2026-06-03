export const TRAIL_EVENT_DESCRIPTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['description', 'errorMessage'],
  properties: {
    description: {
      anyOf: [
        {
          type: 'string',
          minLength: 100,
          maxLength: 1000,
        },
        { type: 'null' },
      ],
    },
    errorMessage: {
      anyOf: [
        {
          type: 'string',
          minLength: 1,
          maxLength: 300,
        },
        { type: 'null' },
      ],
    },
  },
} as const;
