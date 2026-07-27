export const RACE_TIER_RECOVERY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    races: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          raceIndex: {
            type: 'integer',
            minimum: 0,
          },
          tiers: {
            type: 'array',
            maxItems: 5,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                priceEur: {
                  type: 'number',
                  minimum: 0,
                  maximum: 9999,
                },
                endsAt: {
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
                    },
                    { type: 'null' },
                  ],
                },
              },
              required: ['priceEur', 'endsAt'],
            },
          },
        },
        required: ['raceIndex', 'tiers'],
      },
    },
  },
  required: ['races'],
} as const;
