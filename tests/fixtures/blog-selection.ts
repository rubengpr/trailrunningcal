import type { SelectionContext } from '@/types/blog-selection.types';
export const context: SelectionContext = {
  format: 'regional-selection', regionId: 'catalonia', regionName: 'Cataluña',
  events: Array.from({length: 5}, (_, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index}`, name: `Evento ${index}`, slug: `evento-${index}`, description: null,
    races: [{id: `race-${index}`, name: 'Trail', city: 'Bagà', province: 'Barcelona', distanceKm: 21, elevationGainM: index === 0 ? null : 1200}],
  })),
};
export const response = {
  introduction: 'Cinco eventos con distintas modalidades para comparar tus opciones en Cataluña.',
  selection: 'Esta selección editorial reúne cinco eventos. El orden no es una clasificación.',
  events: context.events.map(event => ({eventId: event.id, contentMarkdown: 'Compara sus modalidades con tu experiencia antes de decidir.'})),
  conclusion: 'Consulta las modalidades de cada evento para elegir una distancia acorde con tu experiencia.',
  primaryKeyword: 'trail running Cataluña', slug: 'Mejores Carreras Cataluña', seoTitle: 'Cinco eventos de trail running en Cataluña',
  metaDescription: 'Compara cinco eventos de trail running en Cataluña, sus localidades y modalidades para elegir tu próxima carrera.',
};
