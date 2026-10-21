import { context } from '@/tests/fixtures/blog-selection';
import type {
  WritingRequest,
  WritingResponse,
} from '@/types/blog-writing.types';

// Fictional data for offline tests only, never evidence for a real article.
export const writingRequest: WritingRequest = {
  regionId: context.regionId,
  events: context.events.map((event, index) => ({
    eventId: event.id,
    eventName: event.name,
    slug: event.slug,
    dossier: {
      context: `${event.name} tiene su centro en el pueblo ficticio ${index}. [1]`,
      sources: [
        {
          title: `Fuente ficticia ${index}`,
          url: `https://example.com/event-${index}`,
        },
      ],
      observations: [],
    },
    consultedSources: [`https://example.com/event-${index}`],
  })),
};

export const writingResponse: WritingResponse = {
  title: 'Las 5 mejores carreras de trail running en Cataluña',
  contentMarkdown:
    'Estos cinco eventos reúnen distintas modalidades de trail running en Cataluña.\n\n' +
    '## Una selección editorial\n\nEl orden no representa una clasificación.\n\n' +
    context.events
      .map(
        (event, index) =>
          `## ${event.name}\n\n${event.name} tiene su centro en el pueblo ficticio ${index}.\n\n${index % 2 === 0 ? '### Antes de elegir\n\nCompara las modalidades con tu experiencia.' : '- Revisa tu experiencia.\n- Consulta las modalidades.'}`,
      )
      .join('\n\n') +
    '\n\n## Elige tu próximo evento\n\nValora tu experiencia y el recorrido disponible antes de decidir.',
  primaryKeyword: 'trail running en Cataluña',
  slug: 'mejores-carreras-trail-cataluna',
  seoTitle: 'Cinco eventos de trail running para descubrir Cataluña',
  metaDescription:
    'Descubre cinco eventos de trail running en Cataluña, conoce qué los diferencia y compara sus modalidades para elegir tu próximo reto con criterio.',
  references: context.events.map((event, index) => ({
    eventName: event.name,
    excerpt: `${event.name} tiene su centro en el pueblo ficticio ${index}.`,
    sourceIndexes: [1],
  })),
};
