import { articleSchema } from '@/lib/blog/article-schema';
import type { WritingInput } from '@/types/blog-writing.types';

export function writingSchema(input: WritingInput) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [...articleSchema.required, 'references'],
    properties: {
      ...articleSchema.properties,
      contentMarkdown: {
        type: 'string',
        description:
          'Artículo completo: introducción, selección editorial, cinco eventos en H2 y cierre. H2/H3, sin H1, URLs, enlaces, imágenes, HTML ni JSX.',
      },
      references: {
        type: 'array',
        maxItems: 100,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['eventName', 'excerpt', 'sourceIndexes'],
          properties: {
            eventName: {
              type: 'string',
              enum: input.events.map((event) => event.eventName),
            },
            excerpt: {
              type: 'string',
              description:
                'Fragmento literal del texto visible de la sección del evento, sin marcas Markdown.',
            },
            sourceIndexes: {
              type: 'array',
              minItems: 1,
              maxItems: 50,
              items: { type: 'integer', minimum: 1 },
            },
          },
        },
      },
    },
  };
}
