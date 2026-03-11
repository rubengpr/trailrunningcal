import OpenAI from 'openai';

const client = new OpenAI();

const response = await client.responses.create({
  model: 'gpt-5-mini-2025-08-07',
  input: 'https://cursadelsmussols.cat/',
  instructions: `
Extract information only from the allowed domain.
Always reply in Spanish.
Return only a valid JSON object.
If a field cannot be determined with certainty, return "".
The date must be in YYYY-MM-DD format.
If province is not available is search results, infere from city and viceversa
The description must have a maximum of 100 characters.
Do not invent or infer data that is not explicit.
`,
  tools: [
    {
      type: 'web_search',
      filters: {
        allowed_domains: ['cursadelsmussols.cat'],
      },
      search_context_size: 'low',
    },
  ],
  text: {
    format: {
      type: 'json_schema',
      name: 'trail_race_event',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          date: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'date', 'city', 'province', 'description'],
      },
    },
  },
});

console.log(response.output_text);
